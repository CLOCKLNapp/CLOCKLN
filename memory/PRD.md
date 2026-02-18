# CLOCKLN - Product Requirements Document

## Problema Original
Criar um aplicativo SaaS global chamado CLOCKLN, uma plataforma inteligente de controle de ponto corporativo.

## Última Atualização - 18/02/2026
- ✅ NOVOS PLANOS IMPLEMENTADOS:
  - **Trial**: 30 dias grátis / 5 funcionários
  - **Pro**: €29,90/mês / 50 funcionários
  - **Plus**: €59,90/mês / 150 funcionários  
  - **Business**: €99,90/mês / 500 funcionários
- ✅ Descontos por período:
  - Anual: +1 mês grátis
  - 3 Anos: +5 meses grátis
  - 5 Anos: +1 ano grátis (BEST VALUE)
- ✅ Moedas: EUR e USD (removido BRL)
- ✅ Trial com card especial destacado

## Funcionalidades Principais
- Registro de ponto automático (via totem com QR code/NFC e geolocalização para remotos)
- Cálculo de horas e gestão de banco de horas
- Organização de documentos trabalhistas (atestados)
- Geração de relatórios PDF/Excel
- Sistema de notificações
- Multilíngue (17 idiomas) e seguro (multi-tenant, LGPD/DSGVO)
- Modelo SaaS por assinatura

## Stack Tecnológico
- **Backend**: FastAPI + MongoDB
- **Frontend**: React + Tailwind CSS + Shadcn/UI
- **Integrações**: Stripe, SendGrid, PWA
- **Deploy**: Vercel (Frontend) + Railway (Backend)

## Planos de Preços (ATUALIZADO)

### Trial (Grátis)
- 30 dias grátis
- Até 5 funcionários
- Todas funcionalidades básicas

### Pro - €29,90/mês
- Até 50 funcionários
- QR Code & Geolocalização
- Mapa de ponto remoto
- Relatórios básicos
- Suporte por email
- **Anual**: €328,90 (+1 mês grátis)
- **3 Anos**: €1.047,50 (+5 meses grátis)
- **5 Anos**: €1.495,00 (+1 ano grátis)

### Plus - €59,90/mês (Popular)
- Até 150 funcionários
- Todas funções do Pro
- Relatórios avançados (PDF/Excel)
- Gestão de banco de horas
- Suporte prioritário
- **Anual**: €658,90 (+1 mês grátis)
- **3 Anos**: €2.096,50 (+5 meses grátis)
- **5 Anos**: €2.995,00 (+1 ano grátis)

### Business - €99,90/mês
- Até 500 funcionários
- Todas funções do Plus
- Perfis de gerente
- Marca personalizada
- Acesso à API
- Suporte dedicado
- **Anual**: €1.098,90 (+1 mês grátis)
- **3 Anos**: €3.496,50 (+5 meses grátis)
- **5 Anos**: €4.995,00 (+1 ano grátis)

## Credenciais de Teste
- **Super Admin**: michaelcaceres71@gmail.com / 123456

## URLs
- **Produção Vercel**: https://clockln-app.vercel.app
- **Backend Railway**: https://clockln-production.up.railway.app

## Arquivos Importantes
- Landing Page: `/app/frontend/src/pages/LandingPage.js`
- Contexto de idiomas: `/app/frontend/src/context/LanguageContext.js`

## Próximas Tarefas
- [ ] Configurar Stripe para pagamentos reais
- [ ] Configurar webhook do Stripe
- [ ] Deploy das alterações na Vercel
