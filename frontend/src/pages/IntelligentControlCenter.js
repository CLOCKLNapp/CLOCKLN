import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Shield, Zap, FileText, AlertTriangle, Check, X,
  Terminal, Clock, User, ChevronRight, RefreshCw,
  AlertCircle, CheckCircle, Info
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { useToast } from '../hooks/use-toast';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function IntelligentControlCenter() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [commandInput, setCommandInput] = useState('');
  const [targetEmail, setTargetEmail] = useState('');
  const [pendingCommand, setPendingCommand] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [runningCheck, setRunningCheck] = useState(false);

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await axios.get(`${API}/intelligent/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDashboard(response.data);
    } catch (error) {
      if (error.response?.status === 403) {
        toast({
          title: "Acesso Negado",
          description: "Este recurso requer CLOCKLN Intelligent Edition",
          variant: "destructive"
        });
        navigate('/dashboard');
      } else {
        console.error('Error fetching dashboard:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const executeCommand = async () => {
    if (!commandInput.trim()) return;

    try {
      const response = await axios.post(`${API}/ai/command`, {
        command: commandInput,
        target_employee_email: targetEmail || null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setPendingCommand(response.data);
      toast({
        title: "Comando Analisado",
        description: `Ação: ${response.data.action}. Confirme para executar.`
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: error.response?.data?.detail || "Erro ao processar comando",
        variant: "destructive"
      });
    }
  };

  const confirmCommand = async () => {
    if (!pendingCommand) return;

    try {
      await axios.post(`${API}/ai/confirm`, {
        command_id: pendingCommand.command_id,
        confirmation_token: pendingCommand.confirmation_token
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast({
        title: "Comando Executado",
        description: "Ação concluída com sucesso"
      });
      
      setPendingCommand(null);
      setCommandInput('');
      setTargetEmail('');
      fetchDashboard();
    } catch (error) {
      toast({
        title: "Erro",
        description: error.response?.data?.detail || "Erro ao executar comando",
        variant: "destructive"
      });
    }
  };

  const runComplianceCheck = async () => {
    setRunningCheck(true);
    try {
      const response = await axios.get(`${API}/compliance/check`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast({
        title: "Verificação Concluída",
        description: `${response.data.checked_employees} funcionários verificados. ${response.data.alerts_created} alertas criados.`
      });
      
      fetchDashboard();
    } catch (error) {
      toast({
        title: "Erro",
        description: error.response?.data?.detail || "Erro na verificação",
        variant: "destructive"
      });
    } finally {
      setRunningCheck(false);
    }
  };

  const acknowledgeAlert = async (alertId) => {
    try {
      await axios.patch(`${API}/compliance/alerts/${alertId}/acknowledge`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast({
        title: "Alerta Reconhecido",
        description: "O alerta foi marcado como reconhecido"
      });
      
      fetchDashboard();
    } catch (error) {
      toast({
        title: "Erro",
        description: error.response?.data?.detail || "Erro ao reconhecer alerta",
        variant: "destructive"
      });
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'warning': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      default: return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return <AlertCircle className="w-4 h-4" />;
      case 'warning': return <AlertTriangle className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <Shield className="w-8 h-8 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Intelligent Control Center</h1>
            <p className="text-zinc-400">CLOCKLN Intelligent Edition</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* AI Command Panel */}
          <Card className="lg:col-span-2 bg-zinc-900 border-zinc-800" data-testid="ai-command-panel">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Terminal className="w-5 h-5 text-amber-400" />
                CLOCKLN AI - HR Operator
              </CardTitle>
              <CardDescription>
                Execute HR commands with natural language
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Input
                  placeholder="Enter command (e.g., 'Add vacation day for employee')"
                  value={commandInput}
                  onChange={(e) => setCommandInput(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white"
                  data-testid="command-input"
                />
                <Input
                  placeholder="Target employee email (optional)"
                  value={targetEmail}
                  onChange={(e) => setTargetEmail(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white"
                  data-testid="target-email-input"
                />
                <Button 
                  onClick={executeCommand}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-black"
                  data-testid="execute-command-btn"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Analyze Command
                </Button>
              </div>

              {/* Pending Command Confirmation */}
              {pendingCommand && (
                <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <h4 className="font-semibold text-amber-400 mb-2">Confirm Execution</h4>
                  <p className="text-sm text-zinc-300 mb-3">
                    Action: <span className="font-mono text-amber-400">{pendingCommand.action}</span>
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      onClick={confirmCommand}
                      className="bg-emerald-500 hover:bg-emerald-600 text-black"
                      data-testid="confirm-command-btn"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Confirm
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => setPendingCommand(null)}
                      className="border-zinc-600"
                      data-testid="cancel-command-btn"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Recent Commands */}
              <div>
                <h4 className="text-sm font-semibold text-zinc-400 mb-3">Recent Commands</h4>
                <ScrollArea className="h-48">
                  <div className="space-y-2">
                    {dashboard?.ai_commands?.recent?.map((cmd) => (
                      <div 
                        key={cmd.id}
                        className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-sm text-amber-400">{cmd.action}</span>
                          <Badge variant={cmd.status === 'executed' ? 'default' : 'secondary'}>
                            {cmd.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-zinc-500">
                          {new Date(cmd.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))}
                    {(!dashboard?.ai_commands?.recent || dashboard.ai_commands.recent.length === 0) && (
                      <p className="text-sm text-zinc-500 text-center py-4">No commands yet</p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>

          {/* Stats Panel */}
          <div className="space-y-6">
            {/* Command Stats */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-zinc-400">AI Commands</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-amber-400">
                  {dashboard?.ai_commands?.executed || 0}
                </div>
                <p className="text-sm text-zinc-500">
                  of {dashboard?.ai_commands?.total || 0} total commands
                </p>
              </CardContent>
            </Card>

            {/* Alert Stats */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-zinc-400">Active Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div>
                    <div className="text-2xl font-bold text-red-400">
                      {dashboard?.compliance?.critical_count || 0}
                    </div>
                    <p className="text-xs text-zinc-500">Critical</p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-amber-400">
                      {dashboard?.compliance?.warning_count || 0}
                    </div>
                    <p className="text-xs text-zinc-500">Warning</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Compliance Monitor */}
        <Card className="mt-6 bg-zinc-900 border-zinc-800" data-testid="compliance-panel">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Shield className="w-5 h-5 text-amber-400" />
                  Compliance Monitor (Germany Mode)
                </CardTitle>
                <CardDescription>
                  ArbZG compliance monitoring - 48h weekly limit, overtime tracking, vacation grants
                </CardDescription>
              </div>
              <Button 
                onClick={runComplianceCheck}
                disabled={runningCheck}
                className="bg-amber-500 hover:bg-amber-600 text-black"
                data-testid="run-compliance-check-btn"
              >
                {runningCheck ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Run Check
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-3">
                {dashboard?.compliance?.active_alerts?.map((alert) => (
                  <div 
                    key={alert.id}
                    className={`p-4 rounded-lg border ${getSeverityColor(alert.severity)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {getSeverityIcon(alert.severity)}
                        <div>
                          <p className="font-semibold">{alert.employee_name || 'Unknown'}</p>
                          <p className="text-sm opacity-80">{alert.description}</p>
                          <p className="text-xs opacity-60 mt-1">
                            {new Date(alert.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => acknowledgeAlert(alert.id)}
                        className="border-current text-current hover:bg-current/10"
                        data-testid={`acknowledge-alert-${alert.id}`}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Acknowledge
                      </Button>
                    </div>
                  </div>
                ))}
                {(!dashboard?.compliance?.active_alerts || dashboard.compliance.active_alerts.length === 0) && (
                  <div className="text-center py-8 text-zinc-500">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 text-emerald-400" />
                    <p>No active compliance alerts</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Audit Log Preview */}
        <Card className="mt-6 bg-zinc-900 border-zinc-800" data-testid="audit-panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <FileText className="w-5 h-5 text-amber-400" />
              Immutable Audit Log
            </CardTitle>
            <CardDescription>
              Complete traceability of all AI-triggered actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {dashboard?.audit?.recent_entries?.map((entry) => (
                  <div 
                    key={entry.id}
                    className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700 font-mono text-sm"
                  >
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Clock className="w-3 h-3" />
                      {new Date(entry.timestamp).toLocaleString()}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <User className="w-3 h-3 text-amber-400" />
                      <span className="text-amber-400">{entry.initiating_user_name || entry.initiating_user_id}</span>
                      <ChevronRight className="w-3 h-3 text-zinc-600" />
                      <span className="text-emerald-400">{entry.action_type}</span>
                    </div>
                  </div>
                ))}
                {(!dashboard?.audit?.recent_entries || dashboard.audit.recent_entries.length === 0) && (
                  <p className="text-sm text-zinc-500 text-center py-4">No audit entries yet</p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
