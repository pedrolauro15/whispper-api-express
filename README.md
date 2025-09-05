# Whisper API Express

API Express.js para transcrição e geração de vídeo com legendas traduzidas usando FFmpeg.

## 🚀 Funcionalidades

- ✅ Upload de arquivos de vídeo via multipart
- ✅ Recebimento de segmentos traduzidos via JSON
- ✅ Geração de vídeo com legendas hardcoded usando FFmpeg
- ✅ API REST com Express.js e TypeScript
- ✅ Fallback com dados mock para teste

## 📋 Pré-requisitos

- Node.js 18+ 
- FFmpeg instalado no sistema
- TypeScript

## 🛠️ Instalação

```bash
# Clonar repositório
git clone <repository-url>
cd whisper-api-express

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env

# Instalar FFmpeg (se não estiver instalado)
# Ubuntu/Debian:
sudo apt install ffmpeg

# macOS:
brew install ffmpeg

# Windows:
# Baixar de https://ffmpeg.org/download.html
```

## 🚦 Uso

### Desenvolvimento
```bash
npm run dev
```

### Produção
```bash
npm run build
npm start
```

## 📡 Endpoints

### Health Check
```
GET /health
```

### Gerar Vídeo com Legendas Traduzidas
```
POST /api/transcription/generate-video-with-translated-subtitles
Content-Type: multipart/form-data

Campos:
- video: arquivo de vídeo (mp4, avi, mov, etc.)
- translatedSegments: JSON com array de objetos {start, end, text}
```

### Exemplo de translatedSegments:
```json
[
  {"start": 0, "end": 3, "text": "Primeira legenda traduzida"},
  {"start": 3, "end": 6, "text": "Segunda legenda traduzida"},
  {"start": 6, "end": 9, "text": "Terceira legenda traduzida"}
]
```

### Teste da API
```
GET /api/transcription/test
```

## 🧪 Testando

```bash
# Testar com curl
curl -X POST http://localhost:3000/api/transcription/generate-video-with-translated-subtitles \
  -F "video=@seu-video.mp4" \
  -F 'translatedSegments=[{"start":0,"end":3,"text":"Teste"}]'
```

## ⚙️ Configuração

Edite o arquivo `.env`:

```env
PORT=3000
NODE_ENV=development
TEMP_DIR=./temp
MAX_FILE_SIZE=100MB
ALLOWED_EXTENSIONS=mp4,avi,mov,mkv,mp3,wav,flac
```

## 🔧 Personalização de Legendas

O estilo das legendas pode ser personalizado no código:

- Fonte: Arial
- Tamanho: 18
- Cor: Branco
- Fundo: Preto
- Borda: 1px preta
- Margem: 20px

## 🚨 Solução de Problemas

### FFmpeg não encontrado
```bash
# Verificar se FFmpeg está instalado
ffmpeg -version

# Se não estiver, instalar conforme o sistema operacional
```

### Erro de upload muito grande
- Verifique `MAX_FILE_SIZE` no .env
- Ajuste limite no código se necessário

### Erro de tipo de arquivo
- Verifique se o formato é suportado
- Edite `ALLOWED_EXTENSIONS` se necessário

## 📝 Estrutura do Projeto

```
src/
├── server.ts              # Servidor Express principal
├── controllers/
│   └── transcription.controller.ts   # Controller de transcrição
├── services/
│   └── video.service.ts   # Serviço de processamento de vídeo
└── routes/
    └── transcription.routes.ts        # Rotas da API
```

## 🆚 Vantagens sobre Fastify

- ✅ Melhor suporte para multipart (multer)
- ✅ Ecosystem mais maduro
- ✅ Menos problemas com async iterators
- ✅ Documentação mais extensa
- ✅ Debugging mais simples

## 📄 Licença

MIT
