# 🚢 Portal de Agendamento e Segurança de Visitas (Wilson Sons)

Este projeto é um **Portal Inteligente de Agendamento e Gestão de Segurança de Visitas**, desenvolvido sob medida com design moderno, experiência de usuário otimizada e integração transparente com o **Google Forms e Google Planilhas**.

O sistema garante que nenhum visitante agende uma visita sem revisar previamente as normas de segurança e uso de Equipamentos de Proteção Individual (EPI), automatizando o fluxo de captação e centralização dos dados das solicitações.

---

## ⚡ Resumo das Respostas Rápidas

### 1. O Link Público criado aqui já é suficiente para testes em produção?
**Sim!** O link público compartilhado (**Shared App URL**) que você possui é hospedado de forma automática e segura pela plataforma em contêineres gerenciados. 
- Toda alteração de código ou configuração feita no painel aqui já é refletida e gravada **instantaneamente** no servidor do seu link público.
- Qualquer pessoa na internet pode acessar o link compartilhado, preencher o formulário, e os dados serão inseridos de forma direta e limpa na sua planilha do Google Forms!
- **O GitHub serve como um backup profissional de código v0 (Versionamento)** e possibilita que você porte essa aplicação para outros servidores privados (como seu próprio Google Cloud, Vercel ou VPS) caso no futuro queira migrar o projeto de infraestrutura.

### 2. O que mudamos recentemente com base no seu feedback?
- 🔒 **Sessão Persistente no Painel Admin**: Agora você não é deslogado ao alternar de aba! O estado de login é mantido de forma segura no navegador usando `localStorage`.
- 🚪 **Botão Sair integrado**: Adicionado um botão vermelho **"Sair"** no Painel Admin para que você possa encerrar sua sessão de administrador quando desejar com 1 clique.
- 🙈 **Segurança de Senhas Oculta**: Removemos os textos que exibiam publicamente as senhas de demonstração na tela de login administrativo para impedir que pessoas externas visualizem sua senha de acesso.
- 🔁 **Fluxo de Segurança Obrigatório**: Configurado para que qualquer novo clique em "Solicitar Visita" obrigue o usuário final a passar e concordar com a tela de EPIs e Políticas de Segurança antes de digitar dados, promovendo máxima conformidade regulatória.
- 🔓 **Acesso Facilitado ao Admin**: Concedido acesso direto à aba "Solicitar Visita" para qualquer administrador autenticado sem necessidade de revalidar os EPIs manualmente a cada teste.

---

## 🗺️ Fluxo de Funcionamento do Sistema

```
[ Visitante ] ──(1) Clica em Solicitar──► [ Etapa de Segurança & EPI ]
                                                    │
                                            (2) Aceite Obrigatório
                                                    │
                                                    ▼
[ Google Planilha ] ◄──(4) Integração─── [ Formulário de Agendamento ]
```

---

## 📖 Manual de Uso do Sistema

Este manual passo a passo explica as seções do portal e como configurá-lo para que ele funcione autonomamente.

### 📸 1. Página Inicial (Acolhimento e Navegação)
* **O que o visitante vê:** Uma capa moderna inspirada na identidade visual marítima da Wilson Sons (azul navy e detalhes em laranja segurança).
* **Ação:** O visitante clica em **"Solicitar Visita"** para iniciar o agendamento.
* **Componente Tecnológico:** Controlado por transições fluidas de estado no arquivo `src/App.tsx`.
* *(Dica: Salve uma imagem da Home como `assets/manual_home.png` para exibir aqui)*
* ![Página Inicial](assets/manual_home.png)

---

### 🦺 2. Etapa Obrigatória de Segurança e EPIs
* **O que o visitante vê:** Uma lista com fotos ou ícones interativos detalhando os EPIs obrigatórios (Bota de segurança, Capacete, Óculos e Colete Refletivo).
* **Ação:** O usuário lê as instruções e precisa **concordar explicitamente com os termos** selecionando a caixa de consentimento seguro para que o botão de prosseguir seja destravado.
* **Por que isso é crítico?** Garante conformidade com as normas reguladoras de segurança portuária e industrial (como NR-29 e NR-6).
* ![Segurança e EPIs](assets/manual_seguranca.png)

---

### 📝 3. Formulário de Informações Gerais
* **O que o visitante vê:** O formulário completo contendo 9 campos higienizados:
  1. Nome Completo
  2. CPF (Formatado)
  3. E-mail Corporativo/Pessoal
  4. Telefone / WhatsApp
  5. Empresa / Organização
  6. Cidade / Estado
  7. Quantidade de Visitantes na comitiva
  8. Data e Horário sugerido
  9. Objetivo / Justificativa detalhada da visita
* **O que acontece ao enviar:** O sistema realiza uma requisição `POST` em segundo plano para o servidor Express, que formata as variáveis e as despacha diretamente em formato `multipart/form-data` sob o protocolo seguro do Google Forms.
* ![Formulário de Entrada](assets/manual_formulario.png)

---

### ⚙️ 4. Painel de Administração e Configurações (Apenas Administradores)
Para acessar o Painel Administrativo, clique em **"Painel Admin"** no cabeçalho.

#### 🔑 Como Logar:
1. Digite a sua senha definida para seu sistema.
2. O sistema manterá você conectado mesmo se você recarregar a página ou navegar pela aba pública.

#### 📑 Configurando o seu Google Forms de Produção:
Para que os dados caiam diretamente no seu Google Planilhas, o sistema usa as chaves internas do Google Forms. Você só precisa configurar isso **uma única vez** no Painel:

1. **Insira o Link do Formulário**: Cole a URL de visualização pública do seu Google Forms (aquela terminada em `/viewform`) no campo demarcado.
2. **Uso do Mapeador Automático**:
   * Clique em **"Método Alternativo"**.
   * Abra o código fonte do seu Google Form no navegador pressionando `Ctrl + U`.
   * Copie todo o código (`Ctrl + A` e `Ctrl + C`).
   * Cole na caixa de texto do Painel Admin e clique em **"Extrair e Mapear"**.
   * **O sistema extrai as chaves de forma 100% autônoma!** Ele salva tudo imediatamente nas variáveis do servidor.
3. **Teste Prático**: Clique no botão **"Disparar Linha de Teste"**. Se tudo ocorrer bem, uma nova linha aparecerá instantaneamente em sua planilha vinculada ao Google Forms, confirmando o sucesso da integração online!

* ![Painel de Administração](assets/manual_admin.png)

---

## 🛠️ Tecnologias Utilizadas

- **Frontend:** React 19, TypeScript, Tailwind CSS (com tema customizado e moderno) e biblioteca de animações `motion`.
- **Backend:** Express integrado para rotas API e proxy seguro que evita bloqueios de CORS ao despachar dados para os servidores do Google.
- **Compilador e Empacotador**: Vite & Esbuild de alta velocidade.

---

## 🚀 Como Executar o Projeto Localmente (após baixar do GitHub)

Caso queira baixar ou clonar o projeto do GitHub em sua máquina particular de desenvolvimento, siga estes pequenos passos:

1. **Instale os Módulos de Dependência**:
   ```bash
   npm install
   ```

2. **Inicie o Servidor de Desenvolvimento**:
   ```bash
   npm run dev
   ```
   A aplicação estará rodando localmente no endereço: `http://localhost:3000`.

3. **Gere a Compilação para Produção**:
   Se desejar buildar o aplicativo para rodar em seu próprio servidor de produção compilado:
   ```bash
   npm run build
   npm start
   ```

---

## 📂 Estrutura de Arquivos

```
├── server.ts               # Servidor Node/Express (Manipulação de requisições, proxy API para Google Forms)
├── src/
│   ├── App.tsx             # Arquivo mestre e lógica de roteamento em estado do Frontend
│   ├── index.css           # Estilização global com Tailwind CSS
│   ├── main.tsx            # Ponto de entrada SPA React
│   ├── types.ts            # Tipagens do TypeScript do projeto
│   └── components/         # Componentes React Modulares
│       ├── AdminPanel.tsx  # Sistema gerencial, filtros, importador de formulário, disparo de testes e LOGOUT
│       ├── Header.tsx      # Barra de navegação responsiva e controle de acesso
│       ├── Footer.tsx      # Notas de fim de página da Wilson Sons
│       ├── StepHome.tsx    # Banner visual de entrada
│       ├── StepSafety.tsx  # Aceite obrigatório de EPI e Políticas de Regulação
│       └── StepForm.tsx    # Captação de dados integrada com o script do Google Forms
```

---

### 🎨 Sugestão de Imagens para o Github
Para deixar seu GitHub com uma aparência impecável que impressionará qualquer pessoa que testar o sistema:
1. Abra sua aplicação em tela cheia no navegador.
2. Tire capturas de tela (screenshots) das quatro telas principais comentadas neste manual.
3. Crie uma pasta chamada `assets` na raiz do seu projeto local.
4. Salve os arquivos com os nomes descritos nos marcadores acima (`manual_home.png`, `manual_seguranca.png`, etc.).
5. Quando você enviar para o GitHub, o seu `README.md` lerá esses arquivos automaticamente e exibirá um manual ilustrado elegante!
