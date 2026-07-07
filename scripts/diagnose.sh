#!/bin/bash

# Script de diagnóstico para verificar configuração do sistema
# Uso: bash scripts/diagnose.sh

set -e

echo "🔍 DIAGNÓSTICO DO HOMEWORKPRO"
echo "================================"
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função auxiliar
check_status() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✅ $2${NC}"
  else
    echo -e "${RED}❌ $2${NC}"
  fi
}

# 1. Node.js
echo "1️⃣ Verificando Node.js..."
if command -v node &> /dev/null; then
  NODE_VERSION=$(node -v)
  echo -e "${GREEN}✅ Node.js instalado: $NODE_VERSION${NC}"
else
  echo -e "${RED}❌ Node.js não instalado${NC}"
  exit 1
fi

# 2. pnpm
echo ""
echo "2️⃣ Verificando pnpm..."
if command -v pnpm &> /dev/null; then
  PNPM_VERSION=$(pnpm -v)
  echo -e "${GREEN}✅ pnpm instalado: $PNPM_VERSION${NC}"
else
  echo -e "${RED}❌ pnpm não instalado${NC}"
  exit 1
fi

# 3. Arquivo .env
echo ""
echo "3️⃣ Verificando arquivo .env..."
if [ -f ".env" ]; then
  echo -e "${GREEN}✅ Arquivo .env encontrado${NC}"
  echo "   Conteúdo:"
  grep -E "^[A-Z]" .env | sed 's/^/   /'
else
  echo -e "${YELLOW}⚠️ Arquivo .env não encontrado${NC}"
  echo "   Criando arquivo .env..."
  cat > .env << 'EOF'
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:password@helium/heliumdb?sslmode=disable
LOG_LEVEL=info
EOF
  echo -e "${GREEN}✅ Arquivo .env criado${NC}"
fi

# 4. PostgreSQL
echo ""
echo "4️⃣ Verificando PostgreSQL..."
if command -v psql &> /dev/null; then
  PSQL_VERSION=$(psql --version)
  echo -e "${GREEN}✅ psql instalado: $PSQL_VERSION${NC}"
  
  # Testar conexão
  if psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Conexão com banco bem-sucedida${NC}"
  else
    echo -e "${YELLOW}⚠️ Não foi possível conectar ao banco${NC}"
    echo "   DATABASE_URL: $DATABASE_URL"
  fi
else
  echo -e "${YELLOW}⚠️ psql não instalado (opcional)${NC}"
fi

# 5. Dependências instaladas
echo ""
echo "5️⃣ Verificando dependências..."
if [ -d "node_modules" ]; then
  echo -e "${GREEN}✅ node_modules encontrado${NC}"
else
  echo -e "${YELLOW}⚠️ node_modules não encontrado${NC}"
  echo "   Execute: pnpm install"
fi

# 6. Build do api-server
echo ""
echo "6️⃣ Verificando build do api-server..."
if [ -d "artifacts/api-server/dist" ]; then
  echo -e "${GREEN}✅ Build encontrado${NC}"
else
  echo -e "${YELLOW}⚠️ Build não encontrado${NC}"
  echo "   Execute: cd artifacts/api-server && pnpm run build"
fi

# 7. Porta disponível
echo ""
echo "7️⃣ Verificando se porta 3000 está livre..."
if ! lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
  echo -e "${GREEN}✅ Porta 3000 está livre${NC}"
else
  echo -e "${RED}❌ Porta 3000 já está em uso${NC}"
  lsof -i :3000 || true
fi

echo ""
echo "================================"
echo "🎉 Diagnóstico completo!"
echo ""
echo "Próximas ações:"
echo "1. Se houver avisos ⚠️, execute os comandos sugeridos"
echo "2. Para iniciar o servidor:"
echo "   cd artifacts/api-server"
echo "   pnpm run dev"
echo "3. Para testar em outro terminal:"
echo "   curl http://localhost:3000/api/health"
