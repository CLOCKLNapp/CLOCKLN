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
- Modelo SaaS por assinatura (Trial 15 dias, Pro, Business)

## Stack Tecnológico
- **Backend**: FastAPI + MongoDB (Pymongo/Motor)
- **Frontend**: React + Tailwind CSS + Shadcn/UI
- **Integrações**: Stripe, SendGrid, PWA
- **Deploy**: Vercel (Frontend) + Railway (Backend)

## Status de Deploy - 15/02/2026
- ✅ Frontend: Online na Vercel
- ✅ Backend: Online no Railway
- ✅ MongoDB: Configurado no Railway

## Últimas Alterações - 15/02/2026
### Nova Estrutura de Planos (apenas mensais, em Euro):
- **Trial**: €0 (15 dias grátis, acesso completo, até 50 funcionários)
- **Pro**: €49/mês (até 50 funcionários)
- **Business**: €120/mês (até 500 funcionários)

### Mudanças Implementadas:
- Removidos todos os planos anuais
- Plano "Free" substituído por "Trial" de 15 dias
- Moeda alterada de USD para EUR
- Preços atualizados: Pro €49, Business €120
- Sistema de expiração de trial implementado
- Frontend atualizado para mostrar dias restantes do trial
- Traduções adicionadas para nova estrutura de planos

## Funcionalidades Implementadas
- [x] Autenticação (email/senha e PIN)
- [x] QR Code dinâmico para totem
- [x] Clock-in via geolocalização (remoto/híbrido)
- [x] Dashboard para funcionários, RH e gerentes
- [x] Gestão de férias e ausências
- [x] Upload de documentos
- [x] Notificações e alertas
- [x] Relatórios PDF/Excel
- [x] Planos de assinatura com Stripe (EUR)
- [x] Trial de 15 dias para novas empresas
- [x] Super Admin para conceder acesso VIP
- [x] PWA (Progressive Web App)
- [x] 17 idiomas suportados

## Tarefas Pendentes
- [ ] Configurar Stripe para pagamentos reais (chaves de produção)
- [ ] Configurar webhook do Stripe no Railway
- [ ] Deploy das alterações na Vercel (Save to GitHub)

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
