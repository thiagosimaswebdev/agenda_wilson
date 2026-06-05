# 🚢 Portal de Agendamento e Segurança de Visitas (Wilson Sons)

Este projeto é um **Portal de Agendamento e Gestão de Segurança de Visitas** desenvolvido para otimizar as solicitações de acesso e garantir que todos os visitantes passem por uma validação de conformidade de segurança e normas de Equipamentos de Proteção Individual (EPIs) antes do agendamento.

---

==== LINK PARA TESTE ONLINE: https://ais-pre-muvm5pgkzsozqbcjwvlc3f-568072175560.us-east1.run.app/

## 🗺️ Fluxo de Funcionamento

O sistema segue um fluxo linear e seguro para garantir conformidade antes de qualquer agendamento:

```
[ Visitante ] ──► [ 1. Tela Inicial ] ──► [ 2. Normas de Segurança & EPI ] (Aceite Obrigatório)
                                                    │
                                                    ▼
[ Google Planilha ] ◄── [ 4. Envio Seguro (Proxy) ] ◄── [ 3. Formulário de Cadastro ]
```

1. **Acolhimento (Tela Inicial):** Apresentação do portal com a identidade visual corporativa e acolhedora da Wilson Sons.
2. **Normas de Segurança & EPIs (Obrigatório):** Apresentação visual dos EPIs necessários e leitura das diretrizes de segurança portuária. O visitante precisa dar o aceite digital para desbloquear o formulário de cadastro.
3. **Formulário de Cadastro:** Preenchimento de informações essenciais (Nome, CPF, E-mail, Telefone, Organização, Cidade/Estado, Nº de Visitantes, Data/Hora e Objetivo).
4. **Proxy & Google Planilhas:** O backend processa a solicitação de forma segura e envia os dados diretamente para a planilha associada do Google Forms, de maneira transparente e sem expor credenciais no cliente.

---

## 🛠️ Principais Recursos e Automações Recentes

- **🦺 Conformidade de Segurança:** Sistema rigoroso de bloqueio preventivo que impede visitantes comuns de acessarem o formulário direto antes do termo de aceitação de EPIs e leitura das diretrizes de segurança portuária.
- **⚡ Integração e Funcionamento Completo (Frente de Produção):** Correção do encadeamento assíncrono no formulário da interface pública de agendamento (`StepForm`), unificando o fluxo de envio para operar com a mesma robustez e persistência do simulador de testes da área administrativa.
- **📆 Formatação de Data Inteligente (Multi-partes):** O backend realiza a tradução dinâmica e separação da data selecionada em campos específicos compatíveis com o formato nativo do Google Forms (`_year`, `_month`, `_day`), corrigindo a barreira de sincronização que impedia a inserção das datas corretas e gerava envios vazios ou falhas de interação.
- **🔄 Resolução Automática e Autocura de Campos (Self-Healing):** Algoritmo inteligente que varre o Google Forms ao vivo em tempo real para recuperar mapeamentos caso estejam desalinhados na memória cache (TTL) ou local, realizando mesclas inteligentes e protegendo mapeamentos válidos para preservar a integridade estrutural da planilha.
- **⚙️ Painel de Administração Persistente:** Ambiente robusto para gerenciamento das visitas solicitadas, controle operacional de emails de feedback automatizados, configuração ágil da URL do Google Forms e sessões administrativas de login altamente persistentes com logout expresso.

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
