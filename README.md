# 🚢 Portal de Agendamento e Segurança de Visitas (Wilson Sons)

Este projeto é um **Portal de Agendamento e Gestão de Segurança de Visitas** desenvolvido para otimizar as solicitações de acesso e garantir que todos os visitantes passem por uma validação de conformidade de segurança e normas de Equipamentos de Proteção Individual (EPIs) antes do agendamento.

---

== LINK PARA TESTE: https://ais-pre-muvm5pgkzsozqbcjwvlc3f-568072175560.us-east1.run.app/

## 🗺️ Fluxo de Funcionamento

O sistema segue um fluxo linear e seguro para garantir conformidade antes de qualquer agendamento:

```
[ Visitante ] ──► [ 1. Tela Inicial ] ──► [ 2. Normas de Segurança & EPI ] (Aceite Obrigatório)
                                                    │
                                                    ▼
[ Google Planilha ] ◄── [ 4. Envio Seguro (Proxy) ] ◄── [ 3. Formulário de Cadastro ]
```

1. **Acolhimento (Tela Inicial):** Apresentação do portal com a identidade visual corporativa.
2. **Normas de Segurança & EPIs (Obrigatório):** Apresentação visual dos EPIs necessários e leitura das diretrizes de segurança portuária. O visitante precisa aceitar digitalmente os termos para desbloquear o formulário.
3. **Formulário de Cadastro:** Preenchimento de informações essenciais (Nome, CPF, E-mail, Telefone, Organização, Cidade/Estado, Nº de Visitantes, Data/Hora e Objetivo).
4. **Proxy & Google Planilhas:** O backend processa a solicitação de forma segura e envia os dados diretamente para a planilha associada do Google Forms.

---

## 🛠️ Principais Recursos

- **🦺 Conformidade de Segurança:** Bloqueio preventivo que impede visitantes comuns de acessarem o formulário direto antes do termo de aceitação de EPIs.
- **⚙️ Painel de Administração Persistente:** Ambiente seguro para administradores visualizarem o histórico de visitas, mapearem campos do Google Forms e configurarem rotas de forma ágil, com sessão de login persistente e opção de logout dedicada.
- **🔌 Integração Automatizada:** Mapeador automático que captura as chaves internas do formulário a partir do código extraído do Google Forms.

---

## 💻 Tecnologias Utilizadas

- **Frontend:** React 19, TypeScript, Tailwind CSS e `motion`.
- **Backend:** Node.js com Express (servindo como proxy de rede para evitar problemas de CORS e manter ocultos os endpoints).
- **Builder & Bundler:** Vite e Esbuild para compilação super rápida.

---

## 🚀 Como Executar o Projeto Localmente

Siga estas instruções rápidas para rodar o portal caso clone o repositório em seu ambiente privado:

### 1. Instalar dependências
```bash
npm install
```

### 2. Rodar em ambiente de desenvolvimento
```bash
npm run dev
```
O portal estará disponível no endereço: `http://localhost:3000`.

### 3. Gerar compilação para Produção (Build)
```bash
npm run build
npm start
```
