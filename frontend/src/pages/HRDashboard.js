import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, Clock, TrendingUp, FileText, 
  Plus, Search, MoreVertical, Tv,
  ChevronRight, CheckCircle2, XCircle,
  Palmtree, Bell, Settings, Download, MapPin,
  Crown, Table
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { AppLayout } from '../components/AppLayout';
import { toast } from 'sonner';

export default function HRDashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    email: '',
    password: '',
    role: 'employee',
    pin: '',
    vacation_days_total: 30,
    work_mode: 'onsite',
    home_lat: '',
    home_lng: '',
    location_radius: 100,
    manager_id: '',
  });

  const { api, company } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const [dashRes, empRes] = await Promise.all([
        api.get('/dashboard/hr'),
        api.get('/users'),
      ]);
      setDashboardData(dashRes.data);
      setEmployees(empRes.data);
      // Filter managers for the dropdown
      setManagers(empRes.data.filter(e => e.role === 'manager'));
    } catch (error) {
      toast.error(t('error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddEmployee = async () => {
    try {
      const employeeData = {
        ...newEmployee,
        company_id: company.id,
      };
      
      // Add home_location if remote/hybrid and coordinates provided
      if ((newEmployee.work_mode === 'remote' || newEmployee.work_mode === 'hybrid') && 
          newEmployee.home_lat && newEmployee.home_lng) {
        employeeData.home_location = {
          lat: parseFloat(newEmployee.home_lat),
          lng: parseFloat(newEmployee.home_lng)
        };
        employeeData.location_radius_meters = newEmployee.location_radius;
      }
      
      // Handle manager_id
      if (!newEmployee.manager_id) {
        delete employeeData.manager_id;
      }
      
      // Clean up temp fields
      delete employeeData.home_lat;
      delete employeeData.home_lng;
      delete employeeData.location_radius;
      
      await api.post('/users', employeeData);
      toast.success(t('success'));
      setShowAddEmployee(false);
      setNewEmployee({ 
        name: '', email: '', password: '', role: 'employee', pin: '', 
        vacation_days_total: 30, work_mode: 'onsite', home_lat: '', home_lng: '', location_radius: 100, manager_id: ''
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || t('error'));
    }
  };

  const handleToggleStatus = async (userId, isActive) => {
    try {
      await api.patch(`/users/${userId}`, { is_active: !isActive });
      toast.success(t('success'));
      fetchData();
    } catch (error) {
      toast.error(t('error'));
    }
  };

  const handleExportCSV = async () => {
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const monthEnd = today.toISOString().split('T')[0];
    
    try {
      const response = await api.get(`/reports/export/csv?start_date=${monthStart}&end_date=${monthEnd}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance_report_${monthStart}_${monthEnd}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Relatório exportado!');
    } catch (error) {
      toast.error('Erro ao exportar relatório');
    }
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatHours = (hours) => {
    const h = Math.floor(hours || 0);
    const m = Math.round(((hours || 0) - h) * 60);
    return `${h}h ${m}m`;
  };

  const statCards = [
    {
      title: t('total_employees'),
      value: dashboardData?.total_employees || 0,
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: t('clocked_in_today'),
      value: dashboardData?.clocked_in_today || 0,
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-400/10',
    },
    {
      title: t('monthly_overtime'),
      value: dashboardData?.total_overtime_month || 0,
      icon: TrendingUp,
      color: 'text-amber-400',
      bgColor: 'bg-amber-400/10',
      format: formatHours,
    },
  ];

  const pendingCards = [
    {
      title: 'Documentos Pendentes',
      value: dashboardData?.pending_documents || 0,
      icon: FileText,
      color: 'text-violet-400',
      bgColor: 'bg-violet-400/10',
      path: '/documents-review',
    },
    {
      title: 'Férias Pendentes',
      value: dashboardData?.pending_vacation_requests || 0,
      icon: Palmtree,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-400/10',
      path: '/vacation-requests',
    },
  ];

  return (
    <AppLayout>
      <div className="p-6 space-y-6 pb-24 md:pb-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-[Manrope]">
              {t('hr_dashboard')}
            </h1>
            <p className="text-muted-foreground mt-1">{company?.name}</p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => navigate('/subscription')}
              data-testid="subscription-btn"
            >
              <Crown className="w-4 h-4 mr-2 text-amber-400" />
              Plano
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/reports')}
              data-testid="reports-btn"
            >
              <Table className="w-4 h-4 mr-2" />
              Relatórios
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/send-notification')}
              data-testid="send-notification-btn"
            >
              <Bell className="w-4 h-4 mr-2" />
              Notificações
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/remote-map')}
              data-testid="remote-map-btn"
            >
              <MapPin className="w-4 h-4 mr-2" />
              Mapa Remotos
            </Button>
            <Button
              variant="outline"
              onClick={handleExportCSV}
              data-testid="export-csv-btn"
            >
              <Download className="w-4 h-4 mr-2" />
              CSV
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/totem-setup')}
              data-testid="totem-setup-btn"
            >
              <Settings className="w-4 h-4 mr-2" />
              Totem
            </Button>
            <Button
              className="btn-glow-blue"
              onClick={() => setShowAddEmployee(true)}
              data-testid="add-employee-btn"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('add_employee')}
            </Button>
          </div>
        </motion.div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {statCards.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.05 }}
            >
              <Card className="card-hover border-border/50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.title}</p>
                      <p className="text-3xl font-bold font-mono mt-2">
                        {loading ? '--' : (stat.format ? stat.format(stat.value) : stat.value)}
                      </p>
                    </div>
                    <div className={`p-4 rounded-xl ${stat.bgColor}`}>
                      <stat.icon className={`w-8 h-8 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Pending items */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pendingCards.map((card, index) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.05 }}
            >
              <Card 
                className="card-hover border-border/50 cursor-pointer"
                onClick={() => navigate(card.path)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-xl ${card.bgColor}`}>
                        <card.icon className={`w-6 h-6 ${card.color}`} />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{card.title}</p>
                        <p className="text-2xl font-bold font-mono">
                          {loading ? '--' : card.value}
                        </p>
                      </div>
                    </div>
                    {card.value > 0 && (
                      <Badge variant="secondary" className="bg-amber-500/20 text-amber-400">
                        Pendente
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Employees list */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                {t('employees')}
              </CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={t('search')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="search-employees-input"
                />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : filteredEmployees.length > 0 ? (
                <div className="space-y-3">
                  {filteredEmployees.map((employee) => (
                    <div
                      key={employee.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                      data-testid={`employee-row-${employee.id}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                          <span className="font-bold text-primary">
                            {employee.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{employee.name}</p>
                          <p className="text-sm text-muted-foreground">{employee.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={employee.is_active ? 'default' : 'secondary'}>
                          {employee.is_active ? t('active') : t('inactive')}
                        </Badge>
                        <Badge variant="outline">
                          {employee.role === 'hr' ? t('hr') : employee.role === 'manager' ? t('manager') : t('employee')}
                        </Badge>
                        {employee.work_mode && employee.work_mode !== 'onsite' && (
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                            <MapPin className="w-3 h-3 mr-1" />
                            {employee.work_mode === 'remote' ? 'Remoto' : 'Híbrido'}
                          </Badge>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`employee-menu-${employee.id}`}>
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleToggleStatus(employee.id, employee.is_active)}>
                              {employee.is_active ? 'Desativar' : 'Ativar'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum funcionário encontrado
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Add Employee Dialog */}
        <Dialog open={showAddEmployee} onOpenChange={setShowAddEmployee}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t('add_employee')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{t('employee_name')}</Label>
                <Input
                  value={newEmployee.name}
                  onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                  placeholder="João Silva"
                  data-testid="new-employee-name"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('email')}</Label>
                <Input
                  type="email"
                  value={newEmployee.email}
                  onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                  placeholder="joao@empresa.com"
                  data-testid="new-employee-email"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('password')}</Label>
                <Input
                  type="password"
                  value={newEmployee.password}
                  onChange={(e) => setNewEmployee({ ...newEmployee, password: e.target.value })}
                  placeholder="••••••••"
                  data-testid="new-employee-password"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('role')}</Label>
                  <Select
                    value={newEmployee.role}
                    onValueChange={(value) => setNewEmployee({ ...newEmployee, role: value })}
                  >
                    <SelectTrigger data-testid="new-employee-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">{t('employee')}</SelectItem>
                      <SelectItem value="manager">{t('manager')}</SelectItem>
                      <SelectItem value="hr">{t('hr')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Dias de Férias</Label>
                  <Input
                    type="number"
                    value={newEmployee.vacation_days_total}
                    onChange={(e) => setNewEmployee({ ...newEmployee, vacation_days_total: parseInt(e.target.value) || 30 })}
                    min={0}
                    max={60}
                    data-testid="new-employee-vacation"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('pin')} (opcional)</Label>
                <Input
                  value={newEmployee.pin}
                  onChange={(e) => setNewEmployee({ ...newEmployee, pin: e.target.value })}
                  placeholder="4-6 dígitos"
                  maxLength={6}
                  data-testid="new-employee-pin"
                />
              </div>
              
              {/* Work Mode */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Modo de Trabalho
                </Label>
                <Select
                  value={newEmployee.work_mode}
                  onValueChange={(value) => setNewEmployee({ ...newEmployee, work_mode: value })}
                >
                  <SelectTrigger data-testid="new-employee-work-mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="onsite">Presencial (só totem)</SelectItem>
                    <SelectItem value="hybrid">Híbrido (totem + remoto)</SelectItem>
                    <SelectItem value="remote">Remoto (só geolocalização)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Remote Location Fields */}
              {(newEmployee.work_mode === 'remote' || newEmployee.work_mode === 'hybrid') && (
                <div className="space-y-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    Localização do Trabalho Remoto
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Latitude</Label>
                      <Input
                        type="number"
                        step="0.000001"
                        value={newEmployee.home_lat}
                        onChange={(e) => setNewEmployee({ ...newEmployee, home_lat: e.target.value })}
                        placeholder="-23.550520"
                        data-testid="new-employee-lat"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Longitude</Label>
                      <Input
                        type="number"
                        step="0.000001"
                        value={newEmployee.home_lng}
                        onChange={(e) => setNewEmployee({ ...newEmployee, home_lng: e.target.value })}
                        placeholder="-46.633308"
                        data-testid="new-employee-lng"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Raio permitido (metros)</Label>
                    <Input
                      type="number"
                      value={newEmployee.location_radius}
                      onChange={(e) => setNewEmployee({ ...newEmployee, location_radius: parseInt(e.target.value) || 100 })}
                      min={50}
                      max={1000}
                      data-testid="new-employee-radius"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Dica: Use o Google Maps para obter as coordenadas do endereço
                  </p>
                </div>
              )}

              {/* Manager Assignment (only for employees) */}
              {newEmployee.role === 'employee' && managers.length > 0 && (
                <div className="space-y-2">
                  <Label>Gerente Responsável (opcional)</Label>
                  <Select
                    value={newEmployee.manager_id || 'none'}
                    onValueChange={(value) => setNewEmployee({ ...newEmployee, manager_id: value === 'none' ? '' : value })}
                  >
                    <SelectTrigger data-testid="new-employee-manager">
                      <SelectValue placeholder="Sem gerente atribuído" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem gerente</SelectItem>
                      {managers.map(manager => (
                        <SelectItem key={manager.id} value={manager.id}>
                          {manager.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddEmployee(false)}>
                {t('cancel')}
              </Button>
              <Button onClick={handleAddEmployee} data-testid="save-employee-btn">
                {t('create')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
