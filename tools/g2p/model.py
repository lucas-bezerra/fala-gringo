"""Transformer codificador-decodificador por caractere (grafia → IPA).

Escrito à mão, sem nn.Transformer, para que cada peso tenha nome e forma óbvios: o export (export.py) grava
os tensores com estes nomes e a inferência em TypeScript (etapa seguinte da T3.9) reproduz exatamente estas contas.

Arquitetura (pre-LN):
  x = emb(tokens) * sqrt(d) + posição senoidal
  codificador: x += attn(ln1(x));  x += ff(ln2(x))            ; saída: ln_final
  decodificador: y += self_attn(ln1(y)) [causal]; y += cross_attn(ln2(y), mem); y += ff(ln3(y)); ln_final
  logits = out(y)
"""

from __future__ import annotations

import math

import torch
from torch import nn

from common import BOS, EOS, PAD


def sinusoidal(max_len: int, d: int) -> torch.Tensor:
    pos = torch.arange(max_len).unsqueeze(1)
    div = torch.exp(torch.arange(0, d, 2) * (-math.log(10000.0) / d))
    pe = torch.zeros(max_len, d)
    pe[:, 0::2] = torch.sin(pos * div)
    pe[:, 1::2] = torch.cos(pos * div)
    return pe


class Attention(nn.Module):
    def __init__(self, d: int, heads: int, dropout: float):
        super().__init__()
        self.heads, self.dk = heads, d // heads
        self.q, self.k, self.v, self.o = (nn.Linear(d, d) for _ in range(4))
        self.drop = nn.Dropout(dropout)

    def forward(self, x, mem, mask):
        # mask: True = posição bloqueada; forma broadcastável para (B, H, Lq, Lk)
        b, lq, d = x.shape
        lk = mem.shape[1]
        q = self.q(x).view(b, lq, self.heads, self.dk).transpose(1, 2)
        k = self.k(mem).view(b, lk, self.heads, self.dk).transpose(1, 2)
        v = self.v(mem).view(b, lk, self.heads, self.dk).transpose(1, 2)
        scores = (q @ k.transpose(-2, -1)) / math.sqrt(self.dk)
        scores = scores.masked_fill(mask, float("-inf"))
        attn = self.drop(torch.softmax(scores, dim=-1))
        return self.o((attn @ v).transpose(1, 2).reshape(b, lq, d))


class FeedForward(nn.Module):
    def __init__(self, d: int, ff: int, dropout: float):
        super().__init__()
        self.lin1, self.lin2 = nn.Linear(d, ff), nn.Linear(ff, d)
        self.drop = nn.Dropout(dropout)

    def forward(self, x):
        return self.lin2(self.drop(torch.relu(self.lin1(x))))


class EncoderLayer(nn.Module):
    def __init__(self, d, heads, ff, dropout):
        super().__init__()
        self.ln1, self.ln2 = nn.LayerNorm(d), nn.LayerNorm(d)
        self.attn = Attention(d, heads, dropout)
        self.ff = FeedForward(d, ff, dropout)
        self.drop = nn.Dropout(dropout)

    def forward(self, x, src_mask):
        h = self.ln1(x)
        x = x + self.drop(self.attn(h, h, src_mask))
        return x + self.drop(self.ff(self.ln2(x)))


class DecoderLayer(nn.Module):
    def __init__(self, d, heads, ff, dropout):
        super().__init__()
        self.ln1, self.ln2, self.ln3 = nn.LayerNorm(d), nn.LayerNorm(d), nn.LayerNorm(d)
        self.self_attn = Attention(d, heads, dropout)
        self.cross_attn = Attention(d, heads, dropout)
        self.ff = FeedForward(d, ff, dropout)
        self.drop = nn.Dropout(dropout)

    def forward(self, y, mem, tgt_mask, src_mask):
        h = self.ln1(y)
        y = y + self.drop(self.self_attn(h, h, tgt_mask))
        y = y + self.drop(self.cross_attn(self.ln2(y), mem, src_mask))
        return y + self.drop(self.ff(self.ln3(y)))


class G2P(nn.Module):
    def __init__(self, src_vocab: int, tgt_vocab: int, d_model=192, heads=4, enc_layers=3, dec_layers=3,
                 ff=768, dropout=0.1, max_len=64):
        super().__init__()
        self.config = dict(src_vocab=src_vocab, tgt_vocab=tgt_vocab, d_model=d_model, heads=heads,
                           enc_layers=enc_layers, dec_layers=dec_layers, ff=ff, dropout=dropout, max_len=max_len)
        self.d = d_model
        self.src_emb = nn.Embedding(src_vocab, d_model, padding_idx=PAD)
        self.tgt_emb = nn.Embedding(tgt_vocab, d_model, padding_idx=PAD)
        self.register_buffer("pos", sinusoidal(max_len, d_model), persistent=False)
        self.enc = nn.ModuleList(EncoderLayer(d_model, heads, ff, dropout) for _ in range(enc_layers))
        self.dec = nn.ModuleList(DecoderLayer(d_model, heads, ff, dropout) for _ in range(dec_layers))
        self.enc_ln, self.dec_ln = nn.LayerNorm(d_model), nn.LayerNorm(d_model)
        self.out = nn.Linear(d_model, tgt_vocab)
        self.drop = nn.Dropout(dropout)
        # Com a escala sqrt(d) na entrada, o embedding precisa de desvio d^-1/2. O padrão do PyTorch (desvio 1)
        # deixaria os vetores ~14x maiores que a posição senoidal, e o modelo não aprenderia a ordem das letras.
        for emb in (self.src_emb, self.tgt_emb):
            nn.init.normal_(emb.weight, std=d_model**-0.5)
            with torch.no_grad():
                emb.weight[PAD].zero_()

    def embed(self, emb, ids):
        return self.drop(emb(ids) * math.sqrt(self.d) + self.pos[: ids.shape[1]])

    def encode(self, src):
        src_mask = (src == PAD)[:, None, None, :]
        x = self.embed(self.src_emb, src)
        for layer in self.enc:
            x = layer(x, src_mask)
        return self.enc_ln(x), src_mask

    def decode(self, tgt_in, mem, src_mask):
        lt = tgt_in.shape[1]
        causal = torch.triu(torch.ones(lt, lt, dtype=torch.bool, device=tgt_in.device), 1)
        tgt_mask = causal[None, None] | (tgt_in == PAD)[:, None, None, :]
        y = self.embed(self.tgt_emb, tgt_in)
        for layer in self.dec:
            y = layer(y, mem, tgt_mask, src_mask)
        return self.out(self.dec_ln(y))

    def forward(self, src, tgt_in):
        mem, src_mask = self.encode(src)
        return self.decode(tgt_in, mem, src_mask)

    @torch.no_grad()
    def greedy(self, src, max_out: int | None = None) -> list[list[int]]:
        """Decodificação gulosa em lote. É a mesma que a inferência no navegador vai reproduzir."""
        max_out = max_out or self.config["max_len"] - 1
        mem, src_mask = self.encode(src)
        ys = torch.full((src.shape[0], 1), BOS, dtype=torch.long, device=src.device)
        done = torch.zeros(src.shape[0], dtype=torch.bool, device=src.device)
        for _ in range(max_out):
            nxt = self.decode(ys, mem, src_mask)[:, -1].argmax(-1)
            nxt = torch.where(done, torch.full_like(nxt, PAD), nxt)
            ys = torch.cat([ys, nxt[:, None]], 1)
            done |= nxt == EOS
            if bool(done.all()):
                break
        return ys[:, 1:].tolist()
