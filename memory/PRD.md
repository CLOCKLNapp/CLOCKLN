# CLOCKLN - Product Requirements Document

## Problema Original
Criar um aplicativo SaaS global chamado CLOCKLN, uma plataforma inteligente de controle de ponto corporativo. O sistema deve suportar diferentes tipos de usuários (Funcionário, RH, Gerente) com permissões específicas.

## Funcionalidades Principais
- Registro de ponto automático (via totem com QR code/NFC e geolocalização para remotos)
- Cálculo de horas e gestão de banco de horas
- Organização de documentos trabalhistas (atestados)
- Geração de relatórios PDF/Excel
- Sistema de notificações
- Multilíngue e seguro (multi-tenant, LGPD/DSGVO)
- Modelo SaaS por assinatura (Free, Pro, Business)

## Stack Tecnológico
- **Backend**: FastAPI + MongoDB (Pymongo/Motor)
- **Frontend**: React + Tailwind CSS + Shadcn/UI
- **Integrações**: Stripe, SendGrid, PWA
- **Deploy**: Vercel (Frontend) + Railway (Backend)

## Status de Deploy - 13/02/2026
- ✅ Frontend: Online na Vercel
- 🔄 Backend: Corrigido problema de dependência (`emergentintegrations`), aguardando redeploy no Railway

## Últimas Alterações
- Removida dependência `emergentintegrations` do requirements.txt
- Código do Stripe convertido para usar SDK oficial
- Funcionalidade de Super Admin implementada

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

## Tarefas Pendentes
- [ ] Configurar variáveis de ambiente em produção (Railway + Vercel)
- [ ] Configurar webhook do Stripe
- [ ] Investigar teste instável do frontend

## Credenciais de Teste
- **Super Admin**: michaelcaceres71@gmail.com / 123456
