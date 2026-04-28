# ADR-0005: Deployment — Orange Pi Self-Hosted Runner

**Data:** 2026-04-28  
**Estado:** Aceite  
**Decisores:** Arquitecto Fullstack

---

## Contexto

O CheckMesa destina-se a correr num único dispositivo de baixo custo na rede local do restaurante (Orange Pi). É necessário um pipeline de CI/CD que:

- Garanta que os testes passam antes de qualquer deploy
- Entregue novas versões sem intervenção manual
- Não exija uma cloud registry ou infraestrutura adicional
- Seja seguro — segredos de produção geridos pelo GitHub, nunca hardcoded

O Orange Pi corre arquitectura **ARM64**. Os runners standard do GitHub Actions são **x86-64**, o que torna impraticável construir a imagem no CI e transferi-la para o dispositivo sem QEMU ou um registry multi-arch.

---

## Decisão

Adoptar a estratégia **Self-Hosted Runner no Orange Pi**:

1. O Orange Pi corre um GitHub Actions runner com as labels `self-hosted, linux, arm64`.
2. A cada push em `main`, o runner faz checkout do repositório, constrói a imagem Docker nativamente em ARM64, e reinicia o container.
3. O `NEXTAUTH_SECRET` é armazenado como GitHub Secret e injectado no container via ficheiro `.env` temporário (evita exposição em `ps aux`).
4. O `NEXTAUTH_URL` é um valor não-sensível hardcoded no workflow.

---

## Alternativas Consideradas

| Alternativa | Razão para rejeição |
|---|---|
| SSH deploy (pull + build no device) | Requer 3 secrets adicionais (host, user, key); mais superfície de ataque |
| Build no CI + push para GHCR + pull no device | Requer QEMU para emulação ARM64 (lento, ~15 min); ou runner ARM pago |
| `docker compose` no deploy | Mais complexo sem ganho; o `docker run` cobre o caso de uso |

---

## Consequências

**Positivas:**
- Zero problemas de arquitectura — a imagem é construída nativamente em ARM64
- Apenas 1 GitHub Secret necessário (`NEXTAUTH_SECRET`)
- Pipeline simples e legível (< 80 linhas de YAML)
- Sem dependência de ferramentas externas (sem `appleboy/ssh-action`)

**Negativas / Riscos:**
- O runner deve estar online para o deploy funcionar (aceitável — instalação local)
- O runner executa código do repositório directamente no device — mitigação: só `main` despoleta o deploy, com aprovação opcional via `environment: production`

---

## Configuração Necessária (One-time)

### No Orange Pi
```bash
# 1. Instalar e registar o runner
#    GitHub → Settings → Actions → Runners → New self-hosted runner
#    Seguir as instruções; adicionar labels: self-hosted, linux, arm64

# 2. Permitir docker sem sudo
sudo usermod -aG docker $USER
```

### No GitHub (Settings → Secrets → Actions)
| Secret | Valor |
|---|---|
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` |

