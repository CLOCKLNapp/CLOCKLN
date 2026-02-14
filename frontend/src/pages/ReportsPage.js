import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, Download, Calendar, ArrowLeft,
  Table, Users, Clock, Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { AppLayout } from '../components/AppLayout';
import { toast } from 'sonner';

export default function ReportsPage() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // First day of month
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [downloading, setDownloading] = useState(null);

  const { api } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleDownload = async (type, format) => {
    const key = `${type}-${format}`;
    setDownloading(key);
    
    try {
      let url = '';
      let filename = '';
      
      if (type === 'attendance') {
        url = `/reports/attendance/${format}?start_date=${startDate}&end_date=${endDate}`;
        filename = `relatorio_ponto_${startDate}_${endDate}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
      } else if (type === 'employees') {
        url = `/reports/employees/pdf`;
        filename = `funcionarios_${new Date().toISOString().split('T')[0]}.pdf`;
      }
      
      const response = await api.get(url, { responseType: 'blob' });
      
      // Create download link
      const blob = new Blob([response.data], { 
        type: format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      
      toast.success('Download iniciado!');
    } catch (error) {
      toast.error('Erro ao gerar relatório');
    } finally {
      setDownloading(null);
    }
  };

  const reportCards = [
    {
      id: 'attendance',
      title: 'Relatório de Ponto',
      description: 'Registros detalhados de entrada e saída de todos os funcionários',
      icon: Clock,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      formats: ['pdf', 'excel'],
      requiresDates: true
    },
    {
      id: 'employees',
      title: 'Lista de Funcionários',
      description: 'Cadastro completo de funcionários ativos com informações essenciais',
      icon: Users,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-400/10',
      formats: ['pdf'],
      requiresDates: false
    }
  ];

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
              Relatórios
            </h1>
            <p className="text-muted-foreground">Gere relatórios em PDF ou Excel</p>
          </div>
        </motion.div>

        {/* Date Range Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="w-5 h-5 text-primary" />
                Período do Relatório
              </CardTitle>
              <CardDescription>Selecione o período para relatórios de ponto</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="start-date">Data Inicial</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    data-testid="start-date-input"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <Label htmlFor="end-date">Data Final</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    data-testid="end-date-input"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Report Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reportCards.map((report, index) => (
            <motion.div
              key={report.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
            >
              <Card className="border-border/50 h-full">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${report.bgColor}`}>
                      <report.icon className={`w-6 h-6 ${report.color}`} />
                    </div>
                    <div className="flex-1">
                      <CardTitle>{report.title}</CardTitle>
                      <CardDescription className="mt-1">{report.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    {report.formats.includes('pdf') && (
                      <Button
                        variant="outline"
                        onClick={() => handleDownload(report.id, 'pdf')}
                        disabled={downloading !== null}
                        data-testid={`download-${report.id}-pdf`}
                      >
                        {downloading === `${report.id}-pdf` ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4 mr-2" />
                        )}
                        PDF
                      </Button>
                    )}
                    {report.formats.includes('excel') && (
                      <Button
                        className="btn-glow-blue"
                        onClick={() => handleDownload(report.id, 'excel')}
                        disabled={downloading !== null}
                        data-testid={`download-${report.id}-excel`}
                      >
                        {downloading === `${report.id}-excel` ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Table className="w-4 h-4 mr-2" />
                        )}
                        Excel
                      </Button>
                    )}
                  </div>
                  {report.requiresDates && (
                    <p className="text-xs text-muted-foreground mt-3">
                      * Período: {startDate} a {endDate}
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-border/50 bg-muted/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-medium">Sobre os Relatórios</h4>
                  <p className="text-sm text-muted-foreground">
                    Os relatórios em PDF são ideais para impressão e compartilhamento.
                    Os relatórios em Excel permitem análises mais detalhadas e podem ser 
                    editados conforme sua necessidade.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AppLayout>
  );
}
