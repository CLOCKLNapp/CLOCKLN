# CLOCKLN - Product Requirements Document

## Problema Original
Criar um aplicativo SaaS global chamado CLOCKLN, uma plataforma inteligente de controle de ponto corporativo. O sistema deve suportar diferentes tipos de usuários (Funcionário, RH, Gerente) com permissões específicas.

## Funcionalidades Principais
- Registro de ponto automático (via totem com QR code/NFC e geolocalização para remotos)
- Cálculo de horas e gestão de banco de horas
- Organização de documentos trabalhistas (atestados)
- Geração de relatórios PDF/Excel
- Sistema de notificações
- Multilíngue (17 idiomas) e seguro (multi-tenant, LGPD/DSGVO)
- Modelo SaaS por assinatura (Free, Pro, Business)

## Stack Tecnológico
- **Backend**: FastAPI + MongoDB (Pymongo/Motor)
- **Frontend**: React + Tailwind CSS + Shadcn/UI
- **Integrações**: Stripe, SendGrid, PWA
- **Deploy**: Vercel (Frontend) + Railway (Backend)

## Status de Deploy - 14/02/2026
- ✅ Frontend: Online na Vercel
- ✅ Backend: Online no Railway
- ✅ MongoDB: Configurado no Railway

## Últimas Alterações - 15/02/2026
- ✅ CRIADA Landing Page completa com:
  - Hero Section "Time Tracking Modern for Your Business"
  - Estatísticas (10K+ Users, 500+ Companies, 99.9% Uptime, 17+ Languages)
  - Seção de Features (6 features)
  - Seção de Preços com toggle EUR/USD
  - Planos Pro e Business
  - Períodos: Monthly, 3 Years (+6 meses grátis), 5 Years (+12 meses grátis)
  - REMOVIDO plano Lifetime (a pedido do usuário)
  - 5 Years agora é "BEST VALUE"
  - Call to Action e Footer
- ✅ Landing Page é agora a página inicial (rota /)
- ✅ Corrigido bug do LanguageContext na Landing Page

## Alterações Anteriores - 14/02/2026
- Corrigidas traduções incompletas (alemão, português, inglês)
- Adicionado suporte a safe-area para iPhones com notch
- Suprimido erro ResizeObserver nas configurações
- Adicionadas traduções para páginas: HRDashboard, Settings, TotemPage, Reports

## Funcionalidades Implementadas
- [x] Autenticação (email/senha e PIN)
- [x] QR Code dinâmico para totem
- [x] Clock-in via geolocalização (remoto/híbrido)
- [x] Dashboard para funcionários, RH e gerentes
- [x] Gestão de férias e ausências
- [x] Upload de documentos
- [x] Notificações e alertas
- [x] Relatórios PDF/Excel
- [x] Planos de assinatura com Stripe
- [x] Super Admin para conceder acesso VIP
- [x] PWA (Progressive Web App)
- [x] 17 idiomas suportados

## Tarefas Pendentes
- [ ] Configurar Stripe para pagamentos reais
- [ ] Configurar webhook do Stripe
- [ ] Adicionar mais traduções para páginas secundárias

## Credenciais de Teste
- **Super Admin**: michaelcaceres71@gmail.com / 123456

## URLs de Produção
- **Frontend**: https://clockln-*.vercel.app
- **Backend**: https://clockln-production.up.railway.app

## Idiomas Suportados
1. English
2. Português (Brasil)
3. Português (Portugal)
4. Deutsch
5. Español
6. Français
7. Italiano
8. Nederlands
9. Polski
10. Svenska
11. 简体中文
12. 繁體中文
13. 日本語
14. 한국어
15. العربية
16. हिन्दी
17. Русский
