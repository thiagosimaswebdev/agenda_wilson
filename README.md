# 🚢 Portal de Agendamento e Segurança de Visitas (Wilson Sons)

Este projeto é um **Portal de Agendamento e Gestão de Segurança de Visitas** completo e totalmente integrado, desenvolvido com alto padrão profissional para as operações portuárias da **Wilson Sons (Portos & SESMT)**. O sistema otimiza as solicitações de acesso portuário e estaleiros em conformidade estrita com as normas de segurança corporativas.

---

## 🔗 LINK PARA TESTE ONLINE
Acesse o portal publicado em tempo real para simulações e auditoria operacional:
👉 **[Portal Wilson Sons - Teste Online]** https://ais-pre-muvm5pgkzsozqbcjwvlc3f-568072175560.us-east1.run.app/

---

## 🎨 Identidade Visual e Padrão Wilson Sons
O portal adota rigorosamente a paleta de cores corporativa oficial da empresa, harmonizando alto contraste visual e estética marítima refinada:
- **Azul Marinho Principal (`#003366`):** Aplicado nos cabeçalhos, botões principais, títulos de displays e elementos de marca conceitual.
- **Azul Cyan Brilhante (`#00AED6`):** Utilizado em destaques de etapas, bordas interativas de foco, botões secundários, ícones ativos e links de navegação rápida.
- **Tipografia e Ícones:** O header do projeto incorpora o ícone original de embarcação (Navio Porta-Contêiner duplo e ondas) em alta definição vetorial (SVG) seguido pela assinatura corporativa **Wilson Sons - Portos & SESMT**.

---

## 🗺️ Fluxo de Funcionamento Linear e Seguro

O sistema foi estruturado para atuar em conformidade contínua, forçando o fluxo correto antes de liberar agendamentos:

```
[ Visitante ] 
     │
     ▼
[ 1. Início / Acolhimento ] ──► (Carrossel Dinâmico de Imagens Portuárias + Histórico de Crachás por CPF)
     │
     ▼
[ 2. Segurança & SESMT ] ──► (Assistir Vídeo Institucional + Assinatura Digital de Termo Obrigatória)
     │
     ▼
[ 3. Captura de Foto ] ──► (Webcam integrada com corte profissional ou Upload de Imagem)
     │
     ▼
[ 4. Formulário Completo ] ──► (Inputs com validação de CPF, data e autocura inteligente de destino)
     │
     ▼
[ 5. Sincronização Google ] ──► (Gravação em tempo real via proxy dedicado no Google Forms & Sheets)
     │
     ▼
[ 6. Crachá Virtual e Portaria ] ──► (Geração de QR Code legível para verificação na guarita física)
```

1. **Acolhimento (Tela Inicial):** Hero Banner com o texto clássico original do projeto (*"Agendamento de Visitas e Credenciamento"*), acompanhado por um carrossel de imagens dinâmicas sobre a prática portuária. Integra caixa de busca instantânea de crachás emitidos informando apenas o CPF.
2. **Normas de Segurança & EPIs (Etapa Obrigatória):** Checklist visual de conduta e equipamentos requeridos (Capacete Portuário, Bota de Aço, Colete Refletorizado). O visitante assina digitalmente para validar seu conhecimento e liberar o acesso às etapas seguintes.
3. **Fotografia Digital Integrada:** O visitante captura sua foto na hora via webcam ou efetua o upload de um arquivo retrato, integrando a imagem em sua credencial.
4. **Formulário de Cadastro:** Processamento seguro de dados pessoais (Nome, CPF formatado, Email, Telefone, Organização, Quantidade de Visitantes, Data Desejada e Objetivo de Entrada).
5. **Autocura e Sincronização Google:** O proxy de backend analisa os objetivos e efetua o parse dinâmico de datas para inserção perfeita na planilha online de destino de forma autônoma.
6. **Crachá Virtual e Validação (QR Code):** Gera uma credencial interativa com a foto do visitante, dados sincronizados e um QR Code dinâmico legível na portaria física.

---

## ⚙️ Principais Funções e Novas Atualizações

- **🎯 Conformidade Cromática Wilson Sons:** Todos os botões, caixas de diálogo, animações de progresso e inputs seguem a combinação corporativa de `#003366` e `#00AED6`, garantindo consistência com a identidade visual da empresa.
- **📸 Captura Fotográfica via Webcam:** Widget de captura incorporado no próprio formulário, com recorte automático de proporção retrato profissional e pré-visualização de validação de imagem.
- **📱 Crachá Virtual Portuário:** Consulta instantânea na página inicial pelo CPF do visitante, permitindo resgatar credenciais a qualquer momento sem necessidade de novos cadastros.
- **🔬 Simulador Portuário com Leitor QR & Beep Auditivo:** Interface na aba de Administração simulando uma guarita de portaria inteligente. Possibilita digitar o ID ou CPF do visitante para validar crachás com ondas sonoras realísticas geradas por osciladores Web Audio API (beep de aprovação e buzzer trêmulo de recusa em caso de pendências regulamentares de segurança).
- **➡️ Planilha de Visitas Otimizada:** Painel de controle administrativo com paginação dupla funcional (por setas de retrocesso/avanço e por numeração fixa de registros), garantindo navegação suave mesmo com grandes listas de solicitações.
- **🔄 Algoritmo de Autocura Inteligente (Self-Healing):** Mecanismo ativo no proxy para regenerar os identificadores do Google Forms e Google Sheets caso ocorra desgaste de chamadas externas de integração.

---

## 💻 Stack Tecnológica

- **Frontend:** React 18, TypeScript, Tailwind CSS e `motion/react` para animações fluidas de transição entre abas.
- **Backend:** Node.js integrado com Express, atuando como proxy seguro de requisições para ocultar chaves de APIs e evitar bloqueios indesejados de CORS.
- **Empacotamento:** Vite com compilador Esbuild de altíssima velocidade.

---

## 🚀 Como Executar o Projeto Localmente

Siga os comandos rápidos para rodar o portal localmente em seu ambiente de testes:

```bash
# 1. Instalar as dependências do ecossistema do projeto
npm install

# 2. Iniciar o servidor de desenvolvimento unificado
npm run dev
```

O portal estará disponível de forma local no endereço: `http://localhost:3000`.

Para compilar e gerar a build otimizada de produção pronta para contêineres e deploy:
```bash
npm run build
npm start
```

---

## 📝 Guia de Commits em Português para Publicar no GitHub

Se você deseja publicar suas atualizações no GitHub utilizando a aba integrada da plataforma, utilize estes modelos de commit bem-estruturados em português:

```bash
# Commit Geral da Nova Identidade Visual:
git commit -m "style(visual): ajusta todos os botões e componentes para o padrão de cores e logotipo clássico Wilson Sons"

# Commit das Atualizações do Carrossel e Textos:
git commit -m "feat(home): restaura textos originais de agendamento de visitas com carrossel dinâmico da prática portuária"

# Commit de Melhoria de Fluxo:
git commit -m "feat(flow): refinamento das validações das etapas de segurança, crachá portátil e terminal de portaria"
```
