# ADR-0005: Deployment — Orange Pi via SSH Build

**Data:** 2026-04-28  
**Estado:** Aceite  
**Decisores:** Arquitecto Fullstack

---

## Contexto

O CheckMesa destina-se a correr num único dispositivo de baixo custo na rede local do restaurante (Orange Pi 5). É necessário um pipeline de CI/CD que:

- Garanta que os testes passam antes de qualquer deploy
- Entregue novas versões sem intervenção manual
- Não exija uma cloud registry ou infraestrutura adicional
- Seja seguro — segredos de produção nunca em transit entre CI e o dispositivo

O Orange Pi corre arquitectura **ARM64**. Os runners standard do GitHub Actions são **x86-64**, o que torna impraticável construir a imagem no CI e transferi-la para o dispositivo sem QEMU ou um registry multi-arch.

---

## Decisão

Adoptar a estratégia **SSH Build-on-Device**:

1. O GitHub Actions SSHa para o Orange Pi usando uma chave Ed25519 dedicada.
2. O script remoto faz `git pull origin main`, `docker build`, e reinicia o container.
3. Os segredos de produção (`NEXTAUTH_SECRET`, `NEXTAUTH_URL`) são armazenados num ficheiro `/opt/checkmesa/.env` **no próprio dispositivo** — nunca saem da rede local.
4. A `DATABASE_URL` não é sensível e é passada directamente como argumento `-e`.

---

## Alternativas Consideradas

| Alternativa | Razão para rejeição |
|---|---|
| Build no CI + push para GHCR + pull no device | Requer QEMU para emulação ARM64 (lento, ~15 min); ou runner ARM pago |
| `docker compose` no deploy | Mais complexo sem ganho; o `docker run` cobre o caso de uso |
| Self-hosted runner no Orange Pi | Expõe o dispositivo a execução de código arbitrário do CI; superfície de ataque maior |
| Ansible / Capistrano | Overhead de tooling desnecessário para um único host |

---

## Consequências

**Positivas:**
- Zero problemas de arquitectura — a imagem é construída nativamente em ARM64
- Segredos de produção nunca transitam fora da LAN
- Pipeline simples (< 80 linhas de YAML)

**Negativas / Riscos:**
- O tempo de build depende da performance do Orange Pi (~3-5 min para build frio)
- Se o dispositivo estiver offline, o deploy falha (aceitável — é uma instalação local)
- Um único ponto de falha de hardware (mitigação: backup do volume `checkmesa-db`)

---

## Configuração Necessária (One-time)

### No Orange Pi
```bash
# 1. Clonar o repositório
sudo mkdir -p /opt/checkmesa
sudo chown $USER /opt/checkmesa
git clone <repo-url> /opt/checkmesa

# 2. Criar ficheiro de segredos
cat > /opt/checkmesa/.env <<EOF
NEXTAUTH_SECRET=<segredo-aleatório-32-chars>
NEXTAUTH_URL=https://checkmesa.instavel.org
EOF
chmod 600 /opt/checkmesa/.env

# 3. Autorizar a chave SSH do CI
echo "<chave-pública-ed25519>" >> ~/.ssh/authorized_keys
```

### No GitHub (Settings → Secrets → Actions)
| Secret | Valor |
|---|---|
| `DEPLOY_HOST` | IP ou hostname do Orange Pi |
| `DEPLOY_USER` | Utilizador SSH (ex: `orangepi`) |
| `DEPLOY_SSH_KEY` | Chave privada Ed25519 |

### Gerar par de chaves dedicado
```bash
ssh-keygen -t ed25519 -C "checkmesa-deploy" -f ~/.ssh/checkmesa_deploy -N ""
# Chave privada → DEPLOY_SSH_KEY (GitHub Secret)
# Chave pública → authorized_keys no Orange Pi
```
