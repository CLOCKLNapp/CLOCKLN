import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, ArrowLeft, CheckCircle2, XCircle, 
  Clock, User, Loader2, Eye, Download
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { AppLayout } from '../components/AppLayout';
import { toast } from 'sonner';

export default function DocumentsReviewPage() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const { api } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const fetchDocuments = async () => {
    try {
      const response = await api.get('/documents/pending');
      setDocuments(response.data);
    } catch (error) {
      toast.error(t('error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleReview = async (docId, approved) => {
    setProcessingId(docId);
    try {
      await api.patch(`/documents/${docId}/review?approved=${approved}`);
      toast.success(approved ? 'Documento aprovado!' : 'Documento rejeitado');
      fetchDocuments();
    } catch (error) {
      toast.error(t('error'));
    } finally {
      setProcessingId(null);
    }
  };

  const getDocTypeLabel = (type) => {
    switch (type) {
      case 'medical_certificate':
        return 'Atestado Médico';
      case 'justification':
        return 'Justificativa';
      default:
        return 'Outro';
    }
  };

  const formatDate = (isoString) => {
    return new Date(isoString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6 pb-24 md:pb-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4"
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/dashboard')}
            data-testid="back-btn"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold font-[Manrope] flex items-center gap-2">
              <FileText className="w-6 h-6 text-primary" />
              Documentos Pendentes
            </h1>
            <p className="text-muted-foreground">Revise e aprove documentos dos funcionários</p>
          </div>
        </motion.div>

        {/* Documents List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-muted/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : documents.length > 0 ? (
            <div className="space-y-4">
              {documents.map((doc) => (
                <Card 
                  key={doc.id} 
                  className="border-amber-500/30 bg-amber-500/5"
                  data-testid={`pending-doc-${doc.id}`}
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                          <User className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{doc.user_name}</h3>
                          <p className="text-sm text-muted-foreground mb-2">
                            {getDocTypeLabel(doc.doc_type)} • {formatDate(doc.created_at)}
                          </p>
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{doc.filename}</span>
                          </div>
                          {doc.description && (
                            <p className="text-sm text-muted-foreground bg-muted/30 p-2 rounded">
                              "{doc.description}"
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                          onClick={() => handleReview(doc.id, false)}
                          disabled={processingId === doc.id}
                          data-testid={`reject-doc-${doc.id}`}
                        >
                          {processingId === doc.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <XCircle className="w-4 h-4 mr-1" />
                              Rejeitar
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-500"
                          onClick={() => handleReview(doc.id, true)}
                          disabled={processingId === doc.id}
                          data-testid={`approve-doc-${doc.id}`}
                        >
                          {processingId === doc.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              Aprovar
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-border/50">
              <CardContent className="py-12 text-center">
                <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Tudo em dia!</h3>
                <p className="text-muted-foreground">
                  Não há documentos pendentes para revisão.
                </p>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </AppLayout>
  );
}
