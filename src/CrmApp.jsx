import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase.js";
import {
  LayoutDashboard, ClipboardList, Users, Car, CalendarDays, Package,
  BarChart3, Settings, LogOut, RefreshCw, Search, ChevronRight, X,
  CheckCircle2, Clock3, UserRound, Phone, AtSign, Hash, CalendarClock,
  CircleDollarSign, Wrench, ArrowRight, ChevronLeft, ChevronDown, AlertTriangle, TrendingUp, CalendarCheck, Plus, Save, Boxes, History, Pencil, FileText, Printer, Send, Bell, Gauge, WalletCards, Banknote, Truck, UserCog, PackagePlus,
} from "lucide-react";

const columns = [
  { key: "new", label: "Новая заявка" },
  { key: "approval", label: "Согласование" },
  { key: "production", label: "Производство" },
  { key: "installation", label: "Установка" },
  { key: "done", label: "Готово" },
];

const statusLabels = {
  new: "Новая заявка", approval: "Согласование", production: "Производство",
  installation: "Установка", done: "Готово", cancelled: "Отменён",
};

const leadSourceLabels = { telegram:"Telegram Mini App", phone:"Телефон", website:"Сайт", recommendation:"Рекомендация", whatsapp:"WhatsApp", manual:"Вручную", other:"Другое", unknown:"Не указан" };
const roleLabels = { admin:"Администратор", manager:"Менеджер", master:"Мастер" };

const cancellationReasonLabels = { expensive:"Дорого", changed_mind:"Передумал", competitor:"Выбрал конкурента", no_contact:"Не удалось связаться", timing:"Не устроили сроки", other:"Другое" };

const pageMeta = {
  overview: ["Обзор", "Главное по GarageFlow на сегодня"],
  orders: ["Заказы", "Управление заявками GarageFlow"],
  customers: ["Клиенты", "Клиенты и история их заказов"],
  vehicles: ["Автомобили", "Автомобили клиентов GarageFlow"],
  calendar: ["Календарь", "Запланированные работы и установки"],
  analytics: ["Аналитика", "Показатели GarageFlow по реальным заказам"],
  finance: ["Финансы", "Касса, платежи, долги и начисления мастерам"],
  staff: ["Персонал", "Выработка, начисления и выплаты мастерам"],
  warehouse: ["Склад", "Материалы, остатки и минимальные запасы"],
  settings: ["Настройки", "Услуги, цены и сотрудники CRM"],
  profile: ["Профиль", "Текущий сотрудник и выход из CRM"],
};

function formatPrice(value) {
  return new Intl.NumberFormat("ru-RU").format(Number(value || 0)) + " ₽";
}
function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(new Date(value));
}
function formatDay(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("ru-RU", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  }).format(new Date(value));
}
function getCustomerName(customer) {
  if (!customer) return "Клиент";
  return [customer.first_name, customer.last_name].filter(Boolean).join(" ") || customer.username || "Клиент";
}
function getVehicleName(vehicle) {
  if (!vehicle) return "Автомобиль не указан";
  return [vehicle.brand, vehicle.model, vehicle.configuration].filter(Boolean).join(" ");
}
function getDateTimeLocalValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
}
function orderAmount(order) {
  return Number(order.final_price ?? order.preliminary_price ?? 0);
}

export default function CrmApp() {
  const [session, setSession] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [employee, setEmployee] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activePage, setActivePage] = useState("overview");
  const [financePeriod, setFinancePeriod] = useState("month");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [changingStatus, setChangingStatus] = useState(false);
  const [editingOrder, setEditingOrder] = useState({ final_price: "", manager_comment: "", scheduled_at: "", priority: "normal", lead_source: "unknown", cancellation_reason: "" });
  const [savingOrder, setSavingOrder] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [showCancelled, setShowCancelled] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [mobileOrderStatus, setMobileOrderStatus] = useState("new");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(null);
  const [calendarView, setCalendarView] = useState("week");
  const [calendarAnchor, setCalendarAnchor] = useState(() => new Date());
  const [adminData, setAdminData] = useState({ services: [], inventory: [], employees: [], economics: [], payments: [], suppliers: [], receipts: [], reservations: [], payouts: [] });
  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [orderHistory, setOrderHistory] = useState([]);
  const [newOrder, setNewOrder] = useState({ first_name:"", last_name:"", phone:"", username:"", brand:"", model:"", year:"", configuration:"", license_plate:"", vin:"", service_ids:[], priority:"normal", scheduled_at:"", comment:"", lead_source:"phone" });
  const [inventoryForm, setInventoryForm] = useState({ name:"", unit:"шт", quantity:"", min_quantity:"", price:"" });
  const [supplierForm,setSupplierForm]=useState({name:"",phone:"",email:"",note:""});
  const [receiptForm,setReceiptForm]=useState({inventory_item_id:"",supplier_id:"",quantity:"",unit_price:"",note:""});
  const [payoutDraft,setPayoutDraft]=useState({employee_id:"",amount:"",method:"cash",note:""});
  const [staffPeriod,setStaffPeriod]=useState("month");
  const [serviceDrafts, setServiceDrafts] = useState({});
  const [newService, setNewService] = useState({ name:"", description:"", base_price:"", is_active:true });
  const [savingServiceId, setSavingServiceId] = useState(null);
  const [notificationSettings, setNotificationSettings] = useState({ status_enabled:true, price_enabled:true, schedule_enabled:true });
  const [savingNotificationSettings, setSavingNotificationSettings] = useState(false);
  const [companySettings, setCompanySettings] = useState({ company_name:"GarageFlow", legal_name:"", inn:"", kpp:"", address:"", phone:"", email:"", bank_details:"", document_footer:"" });
  const [savingCompanySettings, setSavingCompanySettings] = useState(false);
  const [sendingDocument, setSendingDocument] = useState("");
  const [productionData, setProductionData] = useState({ tasks: [], materials: [], assigned_employee_id: null, labor_cost: 0 });
  const [productionLoading, setProductionLoading] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [productionTaskDraft, setProductionTaskDraft] = useState({ assigned_employee_id:"", due_at:"" });
  const [uploadingProductionPhoto, setUploadingProductionPhoto] = useState(false);
  const [materialDraft, setMaterialDraft] = useState({ inventory_item_id: "", quantity: "" });
  const [laborCostDraft, setLaborCostDraft] = useState("0");
  const [savingEconomics, setSavingEconomics] = useState(false);
  const [paymentDraft, setPaymentDraft] = useState({ amount:"", method:"card", note:"" });
  const [savingPayment, setSavingPayment] = useState(false);
  const [masterPayDraft, setMasterPayDraft] = useState("0");
  const [crmTasks, setCrmTasks] = useState([]);
  const [orderTasks, setOrderTasks] = useState([]);
  const [taskDraft, setTaskDraft] = useState({ title:"", due_at:"", assigned_employee_id:"" });
  const [viewFilter, setViewFilter] = useState("all");
  const [savingEmployeeId, setSavingEmployeeId] = useState(null);
  const [liveSync, setLiveSync] = useState("connecting");
  const [calendarOpsView, setCalendarOpsView] = useState("schedule");

  useEffect(() => {
    if (!employee?.role) return;
    const allowedPages = {
      admin: new Set(["overview","orders","customers","vehicles","calendar","analytics","finance","staff","warehouse","settings","profile"]),
      manager: new Set(["overview","orders","customers","vehicles","calendar","analytics","finance","staff","warehouse","profile"]),
      master: new Set(["overview","orders","calendar","warehouse","profile"]),
    };
    const allowed = allowedPages[employee.role] || allowedPages.master;
    if (!allowed.has(activePage)) {
      setActivePage("overview");
      setSelectedOrder(null);
      setSearch("");
    }
  }, [employee?.role, activePage]);

  useEffect(() => {
    let mounted = true;
    async function initialize() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(session);
      setCheckingAuth(false);
      if (session) await loadOrders();
    }
    initialize();
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => { mounted = false; subscription.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!session?.user?.id) return;
    let refreshTimer = null;
    const refreshSoon = () => {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => loadOrders(), 350);
    };
    const channel = supabase.channel("garageflow-crm-live")
      .on("postgres_changes", { event:"*", schema:"public", table:"orders" }, refreshSoon)
      .on("postgres_changes", { event:"*", schema:"public", table:"crm_tasks" }, refreshSoon)
      .subscribe((status) => setLiveSync(status === "SUBSCRIBED" ? "live" : status === "CHANNEL_ERROR" ? "fallback" : "connecting"));
    const fallback = setInterval(() => loadOrders(), 45000);
    return () => { clearTimeout(refreshTimer); clearInterval(fallback); supabase.removeChannel(channel); };
  }, [session?.user?.id]);

  async function getAccessToken() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  }
  async function invokeCrmFunction(functionName, body = {}) {
    const token = await getAccessToken();
    if (!token) throw new Error("Сессия закончилась. Войдите снова.");
    const { data, error } = await supabase.functions.invoke(functionName, {
      body, headers: { Authorization: `Bearer ${token}` },
    });
    if (error) { console.error(functionName, error); throw new Error("Ошибка соединения с CRM."); }
    if (!data?.success) throw new Error(data?.error || "Ошибка CRM.");
    return data;
  }
  async function loadOrders() {
    setLoading(true);
    setError("");

    try {
      // Критичные для первого экрана данные загружаем первыми.
      // Как только заказы получены, CRM уже можно показывать пользователю.
      const data = await invokeCrmFunction("crm-orders");
      setEmployee(data.employee);
      setOrders(data.orders || []);

      if (selectedOrder) {
        const refreshed = (data.orders || []).find((o) => o.id === selectedOrder.id);
        if (refreshed) {
          setSelectedOrder(refreshed);
          setEditingOrder({
            final_price: refreshed.final_price ?? "",
            manager_comment: refreshed.manager_comment ?? "",
            scheduled_at: getDateTimeLocalValue(refreshed.scheduled_at),
            priority: refreshed.priority || "normal",
            lead_source: refreshed.lead_source || "unknown",
            cancellation_reason: refreshed.cancellation_reason || "",
          });
        }
      }

      // Не держим весь интерфейс заблокированным, пока грузятся справочники,
      // задачи и настройки уведомлений.
      setLoading(false);

      // Эти три запроса независимы — запускаем одновременно в фоне.
      const [snapshotResult, tasksResult, notifyResult] = await Promise.allSettled([
        invokeCrmFunction("crm-admin", { action: "snapshot" }),
        invokeCrmFunction("crm-admin", { action: "tasks_snapshot" }),
        invokeCrmFunction("crm-notify", { action: "get_settings" }),
      ]);

      if (snapshotResult.status === "fulfilled") {
        const extra = snapshotResult.value;
        setAdminData({
          services: extra.services || [],
          inventory: extra.inventory || [],
          employees: extra.employees || [],
          economics: extra.economics || [],
          payments: extra.payments || [], suppliers:extra.suppliers||[], receipts:extra.receipts||[], reservations:extra.reservations||[], payouts:extra.payouts||[],
        });
        if (extra.company_settings) {
          setCompanySettings((current) => ({ ...current, ...extra.company_settings }));
        }
      } else {
        console.error("crm-admin snapshot", snapshotResult.reason);
      }

      if (tasksResult.status === "fulfilled") {
        setCrmTasks(tasksResult.value.tasks || []);
      } else {
        console.error("crm tasks", tasksResult.reason);
      }

      if (notifyResult.status === "fulfilled") {
        if (notifyResult.value.settings) setNotificationSettings(notifyResult.value.settings);
      } else {
        console.error("crm-notify settings", notifyResult.reason);
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Ошибка загрузки CRM.");
      setLoading(false);
    }
  }

  async function login(event) {
    event.preventDefault(); setLoginLoading(true); setLoginError("");
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setSession(data.session); await loadOrders();
    } catch (err) { console.error(err); setLoginError("Неверный email или пароль."); }
    finally { setLoginLoading(false); }
  }
  async function logout() {
    await supabase.auth.signOut(); setSession(null); setEmployee(null); setOrders([]); setSelectedOrder(null);
  }
  function openOrder(order) {
    setEditingOrder({
      final_price: order.final_price ?? "",
      manager_comment: order.manager_comment ?? "",
      scheduled_at: getDateTimeLocalValue(order.scheduled_at),
      priority: order.priority || "normal",
      lead_source: order.lead_source || "unknown",
      cancellation_reason: order.cancellation_reason || "",
    });
    setSaveMessage(""); setError(""); setSelectedOrder(order);
    setOrderHistory([]);
    invokeCrmFunction("crm-admin", { action:"history", order_id:order.id }).then((data)=>setOrderHistory(data.history||[])).catch(()=>setOrderHistory([]));
    invokeCrmFunction("crm-admin", { action:"tasks_snapshot", order_id:order.id }).then((data)=>setOrderTasks(data.tasks||[])).catch(()=>setOrderTasks([]));
    if (!order.viewed_at) invokeCrmFunction("crm-admin", { action:"mark_viewed", order_id:order.id }).then((data)=>{ setOrders((cur)=>cur.map((o)=>o.id===order.id?{...o,viewed_at:data.viewed_at}:o)); setSelectedOrder((cur)=>cur?{...cur,viewed_at:data.viewed_at}:cur); }).catch(console.error);
    loadProduction(order.id);
  }
  function goToOrder(order) { setActivePage("orders"); openOrder(order); }

  async function confirmRequestedBooking() {
    if (!selectedOrder?.requested_at || savingOrder) return;
    setSavingOrder(true); setSaveMessage(""); setError("");
    try {
      const data = await invokeCrmFunction("crm-admin", { action:"schedule_booking", order_id:selectedOrder.id, scheduled_at:selectedOrder.requested_at, accept_requested:true });
      const updated = { ...selectedOrder, ...(data.order || {}) };
      setSelectedOrder(updated);
      setOrders((current)=>current.map((o)=>o.id===updated.id?{...o,...(data.order||{})}:o));
      setEditingOrder((current)=>({...current,scheduled_at:getDateTimeLocalValue(updated.scheduled_at)}));
      setSaveMessage("Желаемое время клиента принято. Запись подтверждена.");
    } catch (err) { console.error(err); setError(err instanceof Error ? err.message : "Не удалось назначить время."); }
    finally { setSavingOrder(false); }
  }

  async function proposeBookingTime() {
    if (!selectedOrder || savingOrder) return;
    if (!editingOrder.scheduled_at) { setError("Выберите дату и время записи."); return; }
    setSavingOrder(true); setSaveMessage(""); setError("");
    try {
      const date = new Date(editingOrder.scheduled_at);
      if (Number.isNaN(date.getTime())) throw new Error("Проверьте дату и время записи.");
      const scheduledAt = date.toISOString();
      if (scheduledAt === selectedOrder.scheduled_at && selectedOrder.booking_status === "scheduled") {
        setSaveMessage("Это время уже предложено клиенту.");
        return;
      }
      const data = await invokeCrmFunction("crm-admin", { action:"schedule_booking", order_id:selectedOrder.id, scheduled_at:scheduledAt, accept_requested:false });
      const updated = { ...selectedOrder, ...(data.order || {}) };
      setSelectedOrder(updated);
      setOrders((current)=>current.map((o)=>o.id===updated.id?{...o,...(data.order||{})}:o));
      setEditingOrder((current)=>({...current,scheduled_at:getDateTimeLocalValue(updated.scheduled_at)}));
      setSaveMessage("Новое время предложено клиенту. Ожидаем подтверждения.");
    } catch (err) { console.error(err); setError(err instanceof Error ? err.message : "Не удалось предложить время."); }
    finally { setSavingOrder(false); }
  }

  async function cancelBooking() {
    if (!selectedOrder || savingOrder) return;
    if (!window.confirm("Отменить только запись на визит? Сам заказ останется в CRM.")) return;
    setSavingOrder(true); setSaveMessage(""); setError("");
    try {
      const data=await invokeCrmFunction("crm-admin",{action:"cancel_booking",order_id:selectedOrder.id});
      const updated={...selectedOrder,...(data.order||{})}; setSelectedOrder(updated); setOrders(cur=>cur.map(o=>o.id===updated.id?{...o,...(data.order||{})}:o));
      setEditingOrder(cur=>({...cur,scheduled_at:""})); setSaveMessage("Запись отменена. Заказ сохранён.");
    } catch(err){ setError(err instanceof Error?err.message:"Не удалось отменить запись"); } finally { setSavingOrder(false); }
  }

  async function acceptOrder() {
    if (!selectedOrder) return;
    try {
      const data = await invokeCrmFunction("crm-admin", { action:"accept_order", order_id:selectedOrder.id });
      setSelectedOrder((cur)=>({...cur,...data.order}));
      setOrders((cur)=>cur.map((o)=>o.id===selectedOrder.id?{...o,...data.order}:o));
      await loadProduction(selectedOrder.id);
      const h=await invokeCrmFunction("crm-admin",{action:"history",order_id:selectedOrder.id}); setOrderHistory(h.history||[]);
      setSaveMessage("Заявка принята в работу");
    } catch(err) { setError(err instanceof Error?err.message:"Не удалось принять заявку"); }
  }
  async function addCrmTask(event) {
    event.preventDefault(); if(!selectedOrder||!taskDraft.title.trim()) return;
    try {
      await invokeCrmFunction("crm-admin", { action:"save_crm_task", order_id:selectedOrder.id, title:taskDraft.title.trim(), due_at:taskDraft.due_at?new Date(taskDraft.due_at).toISOString():null, assigned_employee_id:taskDraft.assigned_employee_id?Number(taskDraft.assigned_employee_id):employee?.id });
      setTaskDraft({title:"",due_at:"",assigned_employee_id:""});
      const d=await invokeCrmFunction("crm-admin",{action:"tasks_snapshot",order_id:selectedOrder.id}); setOrderTasks(d.tasks||[]);
      const all=await invokeCrmFunction("crm-admin",{action:"tasks_snapshot"}); setCrmTasks(all.tasks||[]);
    } catch(err){ setError(err instanceof Error?err.message:"Не удалось создать задачу"); }
  }
  async function toggleCrmTask(task) {
    try { await invokeCrmFunction("crm-admin",{action:"toggle_crm_task",task_id:task.id,is_done:!task.is_done}); const d=await invokeCrmFunction("crm-admin",{action:"tasks_snapshot",order_id:task.order_id}); if(selectedOrder?.id===task.order_id)setOrderTasks(d.tasks||[]); const all=await invokeCrmFunction("crm-admin",{action:"tasks_snapshot"});setCrmTasks(all.tasks||[]); }
    catch(err){setError(err instanceof Error?err.message:"Не удалось изменить задачу");}
  }
  async function saveEmployeeTelegram(emp) {
    const value=prompt("Telegram chat ID сотрудника", emp.telegram_chat_id || ""); if(value===null)return;
    try { await invokeCrmFunction("crm-admin",{action:"save_employee_telegram",employee_id:emp.id,telegram_chat_id:value}); await loadOrders(); }
    catch(err){setError(err instanceof Error?err.message:"Не удалось сохранить Telegram chat ID");}
  }

  async function saveEmployeeProfile(emp, patch) {
    if (employee?.role !== "admin") return;
    setSavingEmployeeId(emp.id); setError("");
    try {
      const data = await invokeCrmFunction("crm-admin", { action:"save_employee_profile", employee_id:emp.id, ...patch });
      setAdminData((cur)=>({ ...cur, employees:cur.employees.map((x)=>x.id===emp.id?{...x,...data.employee}:x) }));
    } catch(err) { setError(err instanceof Error?err.message:"Не удалось изменить сотрудника"); }
    finally { setSavingEmployeeId(null); }
  }

  async function notifyOrder(orderId, notificationType) {
    try { await invokeCrmFunction("crm-notify", { action:"send", order_id:orderId, notification_type:notificationType }); }
    catch (notifyError) { console.error("crm-notify", notifyError); }
  }
  async function loadProduction(orderId) {
    setProductionLoading(true);
    try {
      const data = await invokeCrmFunction("crm-admin", { action:"production_snapshot", order_id:orderId });
      setProductionData({
        tasks: data.tasks || [],
        materials: data.materials || [],
        photos: data.photos || [],
        assigned_employee_id: data.assigned_employee_id || null,
        labor_cost: Number(data.labor_cost || 0),
      });
      setLaborCostDraft(String(Number(data.labor_cost || 0)));
      setMasterPayDraft(String(Number(data.master_pay || 0)));
    } catch (err) {
      console.error("production_snapshot", err);
      setProductionData({ tasks: [], materials: [], photos: [], assigned_employee_id: null, labor_cost: 0, master_pay: 0 });
      setLaborCostDraft("0");
    } finally {
      setProductionLoading(false);
    }
  }

  async function assignEmployee(employeeId) {
    if (!selectedOrder) return;
    try {
      await invokeCrmFunction("crm-admin", { action:"assign_employee", order_id:selectedOrder.id, employee_id:employeeId ? Number(employeeId) : null });
      setProductionData((c)=>({...c,assigned_employee_id:employeeId ? Number(employeeId) : null}));
      setSaveMessage("Ответственный назначен");
    } catch(err) { setError(err instanceof Error?err.message:"Не удалось назначить сотрудника"); }
  }

  async function addProductionTask(event) {
    event.preventDefault();
    if (!selectedOrder || !newTaskTitle.trim()) return;
    try {
      await invokeCrmFunction("crm-admin", { action:"add_production_task", order_id:selectedOrder.id, title:newTaskTitle.trim(), assigned_employee_id:productionTaskDraft.assigned_employee_id?Number(productionTaskDraft.assigned_employee_id):null, due_at:productionTaskDraft.due_at?new Date(productionTaskDraft.due_at).toISOString():null });
      setNewTaskTitle("");
      setProductionTaskDraft({assigned_employee_id:"",due_at:""});
      await loadProduction(selectedOrder.id);
    } catch(err) { setError(err instanceof Error?err.message:"Не удалось добавить этап"); }
  }

  async function setProductionTaskStatus(task, status) {
    if (!selectedOrder) return;
    try {
      await invokeCrmFunction("crm-admin", { action:"update_production_task", task_id:task.id, status });
      await loadProduction(selectedOrder.id);
    } catch(err) { setError(err instanceof Error?err.message:"Не удалось изменить этап"); }
  }

  async function uploadProductionPhoto(event, kind) {
    const file=event.target.files?.[0];
    event.target.value="";
    if(!file||!selectedOrder) return;
    if(file.size>7*1024*1024){setError("Фото должно быть не больше 7 МБ");return;}
    setUploadingProductionPhoto(true); setError("");
    try {
      const dataUrl=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);});
      await invokeCrmFunction("crm-admin", {action:"upload_production_photo",order_id:selectedOrder.id,kind,file_name:file.name,mime_type:file.type||"image/jpeg",data_url:dataUrl});
      await loadProduction(selectedOrder.id);
    } catch(err){setError(err instanceof Error?err.message:"Не удалось загрузить фото");}
    finally{setUploadingProductionPhoto(false);}
  }

  async function addOrderMaterial(event) {
    event.preventDefault();
    if (!selectedOrder || !materialDraft.inventory_item_id || !materialDraft.quantity) return;
    try {
      await invokeCrmFunction("crm-admin", {
        action:"add_order_material", order_id:selectedOrder.id,
        inventory_item_id:Number(materialDraft.inventory_item_id), quantity:Number(materialDraft.quantity)
      });
      setMaterialDraft({ inventory_item_id:"", quantity:"" });
      await loadProduction(selectedOrder.id);
      const extra = await invokeCrmFunction("crm-admin", { action:"snapshot" });
      setAdminData({ services:extra.services||[], inventory:extra.inventory||[], employees:extra.employees||[], economics:extra.economics||[], payments:extra.payments||[],suppliers:extra.suppliers||[],receipts:extra.receipts||[],reservations:extra.reservations||[],payouts:extra.payouts||[] });
      if (extra.company_settings) setCompanySettings((c)=>({...c,...extra.company_settings}));
    } catch(err) { setError(err instanceof Error?err.message:"Не удалось списать материал"); }
  }

  async function saveOrderEconomics() {
    if (!selectedOrder || savingEconomics) return;
    const laborCost = Number(laborCostDraft || 0);
    if (!Number.isFinite(laborCost) || laborCost < 0) { setError("Проверьте стоимость труда"); return; }
    setSavingEconomics(true); setError("");
    try {
      await invokeCrmFunction("crm-admin", { action:"save_order_economics", order_id:selectedOrder.id, labor_cost:laborCost, master_pay:Number(masterPayDraft||0) });
      setProductionData((c)=>({...c,labor_cost:laborCost}));
      const extra = await invokeCrmFunction("crm-admin", { action:"snapshot" });
      setAdminData({ services:extra.services||[], inventory:extra.inventory||[], employees:extra.employees||[], economics:extra.economics||[], payments:extra.payments||[],suppliers:extra.suppliers||[],receipts:extra.receipts||[],reservations:extra.reservations||[],payouts:extra.payouts||[] });
      if (extra.company_settings) setCompanySettings((c)=>({...c,...extra.company_settings}));
      const history = await invokeCrmFunction("crm-admin", { action:"history", order_id:selectedOrder.id });
      setOrderHistory(history.history||[]);
      setSaveMessage("Экономика заказа сохранена");
    } catch(err) { setError(err instanceof Error?err.message:"Не удалось сохранить экономику заказа"); }
    finally { setSavingEconomics(false); }
  }

  async function addPayment(event) {
    event.preventDefault();
    if (!selectedOrder) return;
    const amount=Number(paymentDraft.amount||0);
    if (!Number.isFinite(amount)||amount<=0) { setError("Укажите сумму платежа"); return; }
    setSavingPayment(true); setError("");
    try {
      await invokeCrmFunction("crm-admin",{action:"add_payment",order_id:selectedOrder.id,amount,method:paymentDraft.method,note:paymentDraft.note});
      setPaymentDraft({amount:"",method:"card",note:""});
      const extra=await invokeCrmFunction("crm-admin",{action:"snapshot"});
      setAdminData({services:extra.services||[],inventory:extra.inventory||[],employees:extra.employees||[],economics:extra.economics||[],payments:extra.payments||[],suppliers:extra.suppliers||[],receipts:extra.receipts||[],reservations:extra.reservations||[],payouts:extra.payouts||[]});
      const h=await invokeCrmFunction("crm-admin",{action:"history",order_id:selectedOrder.id}); setOrderHistory(h.history||[]);
      setSaveMessage("Платёж добавлен");
    } catch(err){setError(err instanceof Error?err.message:"Не удалось добавить платёж");}
    finally{setSavingPayment(false);}
  }

  async function saveCompanySettings() {
    setSavingCompanySettings(true); setError("");
    try {
      const data = await invokeCrmFunction("crm-admin", { action:"save_company_settings", ...companySettings });
      if (data.settings) setCompanySettings((c)=>({...c,...data.settings}));
    } catch (err) { setError(err instanceof Error ? err.message : "Не удалось сохранить реквизиты"); }
    finally { setSavingCompanySettings(false); }
  }

  function escapeDocument(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]));
  }

  function printOrderDocument(type) {
    if (!selectedOrder) return;
    const isQuote = type === "quote";
    const title = isQuote ? "Коммерческое предложение" : "Заказ-наряд";
    const items = selectedOrder.items || [];
    const itemsTotal = items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0);
    const total = orderAmount(selectedOrder);
    const adjustment = total - itemsTotal;
    const rows = items.map((item, index)=>`<tr><td>${index+1}</td><td>${escapeDocument(item.service_name)}</td><td>${escapeDocument(item.material||"—")}</td><td>${Number(item.quantity||1)}</td><td>${formatPrice(item.price)}</td><td>${formatPrice(Number(item.price||0)*Number(item.quantity||1))}</td></tr>`).join("");
    const logoUrl = `${window.location.origin}/furgon-club-logo.jpeg`;
    const today = new Date().toLocaleDateString("ru-RU");
    const customerName = escapeDocument(getCustomerName(selectedOrder.customer));
    const customerPhone = escapeDocument(selectedOrder.customer?.phone || "");
    const vehicleName = escapeDocument(getVehicleName(selectedOrder.vehicle));
    const plate = escapeDocument(selectedOrder.vehicle?.license_plate || "");
    const vin = escapeDocument(selectedOrder.vehicle?.vin || "");
    const companyBlock = `${escapeDocument(companySettings.legal_name||"")}${companySettings.inn?`<br>ИНН ${escapeDocument(companySettings.inn)}`:""}${companySettings.kpp?` · КПП ${escapeDocument(companySettings.kpp)}`:""}${companySettings.address?`<br>${escapeDocument(companySettings.address)}`:""}`;
    const contacts = `${escapeDocument(companySettings.phone||"")}${companySettings.email?`<br>${escapeDocument(companySettings.email)}`:""}`;
    const adjustmentRow = adjustment !== 0 ? `<div class="summaryRow"><span>Корректировка согласованной стоимости</span><strong>${adjustment > 0 ? "+" : ""}${formatPrice(adjustment)}</strong></div>` : "";

    const quoteBody = `
      <div class="quoteHero"><div class="eyebrow">ПРЕДЛОЖЕНИЕ ДЛЯ КЛИЕНТА</div><h1>Коммерческое предложение</h1><p>№${selectedOrder.id} от ${today}</p></div>
      <div class="quoteIntro">Предлагаем выполнить комплекс работ для вашего автомобиля. Ниже указаны выбранные работы, материалы и согласованная стоимость.</div>
      <div class="infoGrid"><div class="infoCard"><span>КЛИЕНТ</span><strong>${customerName}</strong>${customerPhone?`<small>${customerPhone}</small>`:""}</div><div class="infoCard"><span>АВТОМОБИЛЬ</span><strong>${vehicleName}</strong><small>${plate?`Госномер: ${plate}`:""}${vin?`${plate?" · ":""}VIN: ${vin}`:""}</small></div></div>
      <table><thead><tr><th>№</th><th>Работа</th><th>Материал</th><th>Кол.</th><th>Цена</th><th>Сумма</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="summary quoteSummary"><div class="summaryRow"><span>Стоимость выбранных работ</span><strong>${formatPrice(itemsTotal)}</strong></div>${adjustmentRow}<div class="summaryTotal"><span>ИТОГО К ОПЛАТЕ</span><strong>${formatPrice(total)}</strong></div></div>
      <div class="quoteTerms"><strong>Условия предложения</strong><p>Окончательный состав работ и сроки согласовываются с клиентом перед началом выполнения заказа.</p>${selectedOrder.manager_comment?`<p><b>Комментарий:</b> ${escapeDocument(selectedOrder.manager_comment)}</p>`:""}</div>`;

    const workBody = `
      <div class="docTitle"><div><div class="eyebrow">РАБОЧИЙ ДОКУМЕНТ</div><h1>Заказ-наряд №${selectedOrder.id}</h1></div><div class="docDate">Дата: <strong>${today}</strong></div></div>
      <div class="workInfo"><div><span>Заказчик</span><strong>${customerName}</strong>${customerPhone?`<small>${customerPhone}</small>`:""}</div><div><span>Автомобиль</span><strong>${vehicleName}</strong><small>${plate?`Госномер: ${plate}`:""}${vin?`<br>VIN: ${vin}`:""}</small></div></div>
      ${selectedOrder.scheduled_at?`<div class="schedule"><span>Дата и время записи</span><strong>${escapeDocument(formatDate(selectedOrder.scheduled_at))}</strong></div>`:""}
      <h2>Перечень работ</h2><table><thead><tr><th>№</th><th>Работа</th><th>Материал</th><th>Кол.</th><th>Цена</th><th>Сумма</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="summary"><div class="summaryRow"><span>Стоимость по позициям</span><strong>${formatPrice(itemsTotal)}</strong></div>${adjustmentRow}<div class="summaryTotal"><span>ИТОГО К ОПЛАТЕ</span><strong>${formatPrice(total)}</strong></div></div>
      ${selectedOrder.manager_comment?`<div class="workComment"><strong>Комментарий к заказу</strong><p>${escapeDocument(selectedOrder.manager_comment)}</p></div>`:""}
      <div class="acceptance"><strong>Приёмка работ</strong><p>Работы по заказ-наряду выполнены. Заказчик подтверждает получение автомобиля и результат выполненных работ.</p></div>
      <div class="sign"><div><span>Исполнитель</span><b>________________ / ____________</b></div><div><span>Заказчик</span><b>________________ / ____________</b></div></div>`;

    const w = window.open("", "_blank", "width=1000,height=900");
    if (!w) { setError("Браузер заблокировал окно документа. Разрешите всплывающие окна для CRM."); return; }
    w.document.write(`<!doctype html><html lang="ru"><head><meta charset="UTF-8"><title>${title} №${selectedOrder.id}</title><style>
      *{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#111827;margin:0;background:#eef1f4;font-size:13px}.page{width:210mm;min-height:297mm;margin:20px auto;background:#fff;padding:17mm 16mm;box-shadow:0 8px 30px rgba(0,0,0,.12)}
      .head{display:flex;justify-content:space-between;align-items:flex-start;gap:28px;padding-bottom:14px;border-bottom:3px solid #24d8cf}.logo{width:300px;max-height:108px;object-fit:contain;object-position:left center}.company{margin-top:8px;color:#4b5563;line-height:1.5}.contacts{text-align:right;color:#374151;line-height:1.55;padding-top:8px}.eyebrow{font-size:10px;font-weight:800;letter-spacing:1.6px;color:#0f9f99}.quoteHero{padding:28px 0 12px}.quoteHero h1{font-size:30px;margin:4px 0 5px}.quoteHero p{margin:0;color:#6b7280}.quoteIntro{padding:14px 16px;background:#effcfb;border-left:4px solid #24d8cf;border-radius:0 10px 10px 0;line-height:1.55;margin:8px 0 20px}.infoGrid,.workInfo{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:16px 0}.infoCard,.workInfo>div{border:1px solid #dfe5e9;border-radius:12px;padding:14px}.infoCard span,.workInfo span,.schedule span{display:block;color:#6b7280;font-size:10px;font-weight:800;letter-spacing:.8px;margin-bottom:6px}.infoCard strong,.workInfo strong{display:block;font-size:15px}.infoCard small,.workInfo small{display:block;color:#6b7280;margin-top:5px;line-height:1.45}.docTitle{display:flex;justify-content:space-between;align-items:flex-end;padding:25px 0 10px}.docTitle h1{font-size:27px;margin:4px 0 0}.docDate{color:#6b7280}.schedule{display:flex;justify-content:space-between;align-items:center;background:#f3f4f6;border-radius:10px;padding:12px 14px;margin:14px 0}.schedule span{margin:0}.schedule strong{font-size:14px}h2{font-size:16px;margin:22px 0 8px}table{width:100%;border-collapse:collapse;margin-top:14px}th,td{border-bottom:1px solid #dfe5e9;padding:10px 8px;text-align:left;vertical-align:top}th{background:#f5f7f8;font-size:11px;color:#4b5563}td:first-child,th:first-child{width:34px;text-align:center}.summary{width:360px;margin:18px 0 0 auto;border:1px solid #dfe5e9;border-radius:12px;overflow:hidden}.summaryRow,.summaryTotal{display:flex;justify-content:space-between;gap:20px;padding:10px 13px}.summaryRow{border-bottom:1px solid #e5e7eb;color:#4b5563}.summaryTotal{background:#111827;color:#fff;align-items:center}.quoteSummary .summaryTotal{background:#12aaa4}.summaryTotal span{font-size:11px;font-weight:800;letter-spacing:.5px}.summaryTotal strong{font-size:20px}.quoteTerms,.workComment,.acceptance{margin-top:24px;padding:14px 16px;border:1px solid #dfe5e9;border-radius:11px;line-height:1.5}.quoteTerms p,.workComment p,.acceptance p{margin:7px 0 0;color:#4b5563}.acceptance{margin-top:30px;background:#f8fafc}.sign{display:grid;grid-template-columns:1fr 1fr;gap:50px;margin-top:45px}.sign div{display:grid;gap:22px}.sign span{font-weight:700}.sign b{font-weight:400;color:#4b5563}.footer{margin-top:32px;padding-top:13px;border-top:1px solid #dfe5e9;color:#6b7280;white-space:pre-line;font-size:11px;line-height:1.5}
      @media print{body{background:#fff}.page{margin:0;box-shadow:none;width:auto;min-height:auto;padding:12mm 12mm}@page{size:A4;margin:0}}
    </style></head><body><div class="page"><div class="head"><div><img class="logo" src="${logoUrl}" alt="Furgon Club Garage"><div class="company">${companyBlock}</div></div><div class="contacts">${contacts}</div></div>${isQuote?quoteBody:workBody}<div class="footer">${escapeDocument(companySettings.bank_details||"")}\n${escapeDocument(companySettings.document_footer||"")}</div></div><script>window.onload=()=>setTimeout(()=>window.print(),500)<\/script></body></html>`);
    w.document.close();
  }

  async function imageToDataUrl(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Не удалось загрузить логотип.");
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async function sendOrderDocumentToTelegram(type) {
    if (!selectedOrder || sendingDocument) return;
    const isQuote = type === "quote";
    setSendingDocument(type); setError(""); setSaveMessage("");
    try {
      const pdfMakeModule = await import("pdfmake/build/pdfmake");
      const pdfFontsModule = await import("pdfmake/build/vfs_fonts");
      const pdfMake = pdfMakeModule.default || pdfMakeModule;
      const pdfFonts = pdfFontsModule.default || pdfFontsModule;
      if (pdfMake.addVirtualFileSystem) pdfMake.addVirtualFileSystem(pdfFonts);
      else pdfMake.vfs = pdfFonts?.pdfMake?.vfs || pdfFonts?.vfs || pdfFonts;

      const logo = await imageToDataUrl(`${window.location.origin}/furgon-club-logo.jpeg`);
      const items = selectedOrder.items || [];
      const itemsTotal = items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0);
      const total = orderAmount(selectedOrder);
      const adjustment = total - itemsTotal;
      const customerName = getCustomerName(selectedOrder.customer);
      const vehicleName = getVehicleName(selectedOrder.vehicle);
      const today = new Date().toLocaleDateString("ru-RU");
      const tableBody = [["№","Работа","Материал","Кол.","Цена","Сумма"], ...items.map((item,index)=>[
        String(index+1), String(item.service_name||""), String(item.material||"—"), String(item.quantity||1),
        formatPrice(item.price), formatPrice(Number(item.price||0)*Number(item.quantity||1))
      ])];
      const summary = [
        { columns:[{text:"Стоимость по позициям",color:"#4b5563"},{text:formatPrice(itemsTotal),bold:true,alignment:"right"}], margin:[0,5,0,0] },
        ...(adjustment !== 0 ? [{ columns:[{text:"Корректировка согласованной стоимости",color:"#4b5563"},{text:`${adjustment>0?"+":""}${formatPrice(adjustment)}`,bold:true,alignment:"right"}], margin:[0,5,0,0] }] : []),
        { columns:[{text:"ИТОГО К ОПЛАТЕ",bold:true},{text:formatPrice(total),bold:true,fontSize:16,alignment:"right"}], margin:[0,10,0,0] }
      ];
      const docDefinition = {
        pageSize:"A4", pageMargins:[42,38,42,42], defaultStyle:{font:"Roboto",fontSize:10,color:"#111827"},
        content:[
          {columns:[{image:logo,width:190},{stack:[companySettings.phone||"",companySettings.email||""],alignment:"right",color:"#374151"}]},
          {text:companySettings.legal_name||companySettings.company_name||"GarageFlow",margin:[0,8,0,0],bold:true},
          {text:[companySettings.inn?`ИНН ${companySettings.inn}`:"",companySettings.address||""].filter(Boolean).join(" · "),color:"#4b5563",margin:[0,2,0,12]},
          {canvas:[{type:"line",x1:0,y1:0,x2:510,y2:0,lineWidth:2,lineColor:"#24d8cf"}],margin:[0,0,0,18]},
          {text:isQuote?"ПРЕДЛОЖЕНИЕ ДЛЯ КЛИЕНТА":"РАБОЧИЙ ДОКУМЕНТ",fontSize:8,bold:true,color:"#0f9f99",characterSpacing:1.2},
          {text:isQuote?"Коммерческое предложение":`Заказ-наряд №${selectedOrder.id}`,fontSize:22,bold:true,margin:[0,3,0,3]},
          {text:isQuote?`№${selectedOrder.id} от ${today}`:`Дата: ${today}`,color:"#6b7280",margin:[0,0,0,16]},
          {table:{widths:["*","*"],body:[[
            {stack:[{text:isQuote?"КЛИЕНТ":"ЗАКАЗЧИК",fontSize:8,bold:true,color:"#6b7280"},{text:customerName,bold:true,margin:[0,4,0,0]},{text:selectedOrder.customer?.phone||"",color:"#6b7280",fontSize:9}]},
            {stack:[{text:"АВТОМОБИЛЬ",fontSize:8,bold:true,color:"#6b7280"},{text:vehicleName,bold:true,margin:[0,4,0,0]},{text:[selectedOrder.vehicle?.license_plate?`Госномер: ${selectedOrder.vehicle.license_plate}`:"",selectedOrder.vehicle?.vin?`VIN: ${selectedOrder.vehicle.vin}`:""].filter(Boolean).join(" · "),color:"#6b7280",fontSize:9}]}
          ]]},layout:"lightHorizontalLines",margin:[0,0,0,16]},
          ...(!isQuote && selectedOrder.scheduled_at ? [{text:`Дата и время записи: ${formatDate(selectedOrder.scheduled_at)}`,bold:true,margin:[0,0,0,12]}] : []),
          {table:{headerRows:1,widths:[22,"*",95,30,58,62],body:tableBody},layout:"lightHorizontalLines"},
          {stack:summary,margin:[150,12,0,0]},
          ...(selectedOrder.manager_comment ? [{text:`Комментарий: ${selectedOrder.manager_comment}`,margin:[0,18,0,0]}] : []),
          ...(isQuote ? [{text:"Условия предложения",bold:true,margin:[0,22,0,4]},{text:"Окончательный состав работ и сроки согласовываются с клиентом перед началом выполнения заказа.",color:"#4b5563"}] : [{text:"Приёмка работ",bold:true,margin:[0,24,0,4]},{text:"Работы по заказ-наряду выполнены. Заказчик подтверждает получение автомобиля и результат выполненных работ.",color:"#4b5563"},{columns:[{text:"Исполнитель: ____________________",margin:[0,35,0,0]},{text:"Заказчик: ____________________",margin:[20,35,0,0]}]}]),
          {text:[companySettings.bank_details||"",companySettings.document_footer||""].filter(Boolean).join("\n"),fontSize:8,color:"#6b7280",margin:[0,28,0,0]}
        ]
      };
      const pdfBase64 = await new Promise((resolve) => pdfMake.createPdf(docDefinition).getBase64(resolve));
      const data = await invokeCrmFunction("crm-notify", { action:"send_document", order_id:selectedOrder.id, document_type:type, pdf_base64:pdfBase64 });
      if (data.skipped) throw new Error(data.reason === "customer_has_no_telegram" ? "У клиента нет Telegram ID." : "Документ не отправлен.");
      setSaveMessage(`${isQuote ? "Коммерческое предложение" : "Заказ-наряд"} отправлен клиенту в Telegram`);
    } catch (err) { console.error(err); setError(err instanceof Error ? err.message : "Не удалось отправить документ в Telegram."); }
    finally { setSendingDocument(""); }
  }

  async function saveNotificationSettings() {
    setSavingNotificationSettings(true); setError("");
    try {
      const data = await invokeCrmFunction("crm-notify", { action:"save_settings", settings:notificationSettings });
      if (data.settings) setNotificationSettings(data.settings);
    } catch (err) { setError(err instanceof Error ? err.message : "Не удалось сохранить уведомления"); }
    finally { setSavingNotificationSettings(false); }
  }

  async function changeStatus(order, status) {
    if (changingStatus || order.status === status) return;
    setChangingStatus(true); setError(""); setSaveMessage("");
    try {
      await invokeCrmFunction("crm-update-status", { order_id: order.id, status });
      setOrders((current) => current.map((o) => o.id === order.id ? { ...o, status } : o));
      if (selectedOrder?.id === order.id) setSelectedOrder((current) => ({ ...current, status }));
      setSaveMessage("Статус изменён");
      await notifyOrder(order.id, status === "done" ? "done" : "status_changed");
    } catch (err) { console.error(err); setError(err instanceof Error ? err.message : "Не удалось изменить статус."); }
    finally { setChangingStatus(false); }
  }
  async function saveOrderChanges() {
    if (!selectedOrder || savingOrder) return;
    setSavingOrder(true); setSaveMessage(""); setError("");
    try {
      let scheduledAt = null;
      if (editingOrder.scheduled_at) {
        const date = new Date(editingOrder.scheduled_at);
        if (Number.isNaN(date.getTime())) throw new Error("Проверьте дату и время записи.");
        scheduledAt = date.toISOString();
      }
      const oldFinalPrice = selectedOrder.final_price;
      const oldScheduledAt = selectedOrder.scheduled_at;
      const data = await invokeCrmFunction("crm-update-order", {
        order_id: selectedOrder.id,
        final_price: editingOrder.final_price === "" ? null : Number(editingOrder.final_price),
        manager_comment: editingOrder.manager_comment,
        scheduled_at: scheduledAt,
        priority: editingOrder.priority || "normal",
      });
      let bookingData = null;
      if (scheduledAt && scheduledAt !== oldScheduledAt) {
        bookingData = await invokeCrmFunction("crm-admin", { action:"schedule_booking", order_id:selectedOrder.id, scheduled_at:scheduledAt, accept_requested:false });
      }
      const salesData = await invokeCrmFunction("crm-admin", { action:"save_sales_meta", order_id:selectedOrder.id, lead_source:editingOrder.lead_source || "unknown", cancellation_reason:editingOrder.cancellation_reason || null });
      const updated = { ...selectedOrder, ...data.order, ...(bookingData?.order || {}), ...(salesData.order || {}) };
      setSelectedOrder(updated);
      setOrders((current) => current.map((o) => o.id === updated.id ? { ...o, ...data.order } : o));
      setEditingOrder({
        final_price: updated.final_price ?? "",
        manager_comment: updated.manager_comment ?? "",
        scheduled_at: getDateTimeLocalValue(updated.scheduled_at),
        priority: updated.priority || "normal",
        lead_source: updated.lead_source || editingOrder.lead_source || "unknown",
        cancellation_reason: updated.cancellation_reason || editingOrder.cancellation_reason || "",
      });
      setSaveMessage("Изменения сохранены");
      if (String(oldFinalPrice ?? "") !== String(updated.final_price ?? "")) await notifyOrder(updated.id, "price_changed");
      // schedule_booking already sends the appointment proposal; do not send a second schedule_changed Telegram notification here.
    } catch (err) { console.error(err); setError(err instanceof Error ? err.message : "Не удалось сохранить заказ."); }
    finally { setSavingOrder(false); }
  }
  async function cancelOrder() {
    if (!selectedOrder || savingOrder) return;
    if (!window.confirm(`Отменить заказ №${selectedOrder.id}?`)) return;
    setSavingOrder(true); setError(""); setSaveMessage("");
    try {
      if (!editingOrder.cancellation_reason) throw new Error("Выберите причину отказа перед отменой заказа.");
      const salesData = await invokeCrmFunction("crm-admin", { action:"save_sales_meta", order_id:selectedOrder.id, lead_source:editingOrder.lead_source || "unknown", cancellation_reason:editingOrder.cancellation_reason });
      const data = await invokeCrmFunction("crm-update-order", { order_id: selectedOrder.id, status: "cancelled" });
      setOrders((current) => current.map((o) => o.id === selectedOrder.id ? { ...o, ...data.order } : o));
      await notifyOrder(selectedOrder.id, "cancelled");
      setSelectedOrder(null);
    } catch (err) { console.error(err); setError(err instanceof Error ? err.message : "Не удалось отменить заказ."); }
    finally { setSavingOrder(false); }
  }

  async function createManualOrder(event) {
    event.preventDefault(); setSavingOrder(true); setError("");
    try {
      const data = await invokeCrmFunction("crm-admin", { action:"create_order", customer:{first_name:newOrder.first_name,last_name:newOrder.last_name,phone:newOrder.phone,username:newOrder.username}, vehicle:{brand:newOrder.brand,model:newOrder.model,year:newOrder.year,configuration:newOrder.configuration,license_plate:newOrder.license_plate,vin:newOrder.vin}, service_ids:newOrder.service_ids, priority:newOrder.priority, scheduled_at:newOrder.scheduled_at ? new Date(newOrder.scheduled_at).toISOString() : null, comment:newOrder.comment, lead_source:newOrder.lead_source||"phone" });
      setShowCreateOrder(false); setNewOrder({ first_name:"", last_name:"", phone:"", username:"", brand:"", model:"", year:"", configuration:"", license_plate:"", vin:"", service_ids:[], priority:"normal", scheduled_at:"", comment:"", lead_source:"phone" }); await loadOrders(); setActivePage("orders");
      alert(`Заказ №${data.order_id} создан`);
    } catch(err){ setError(err instanceof Error?err.message:"Не удалось создать заказ"); } finally { setSavingOrder(false); }
  }
  async function saveInventory(event) {
    event.preventDefault();
    try { await invokeCrmFunction("crm-admin", { action:"save_inventory", ...inventoryForm }); setInventoryForm({name:"",unit:"шт",quantity:"",min_quantity:"",price:""}); await loadOrders(); }
    catch(err){ setError(err instanceof Error?err.message:"Не удалось сохранить материал"); }
  }
  async function createSupplier(event){event.preventDefault();try{await invokeCrmFunction("crm-admin",{action:"save_supplier",...supplierForm});setSupplierForm({name:"",phone:"",email:"",note:""});await loadOrders();}catch(err){setError(err instanceof Error?err.message:"Не удалось сохранить поставщика");}}
  async function addReceipt(event){event.preventDefault();try{await invokeCrmFunction("crm-admin",{action:"add_inventory_receipt",inventory_item_id:Number(receiptForm.inventory_item_id),supplier_id:receiptForm.supplier_id?Number(receiptForm.supplier_id):null,quantity:Number(receiptForm.quantity),unit_price:Number(receiptForm.unit_price),note:receiptForm.note});setReceiptForm({inventory_item_id:"",supplier_id:"",quantity:"",unit_price:"",note:""});await loadOrders();}catch(err){setError(err instanceof Error?err.message:"Не удалось оформить приход");}}
  async function addPayout(event){event.preventDefault();try{await invokeCrmFunction("crm-admin",{action:"add_employee_payout",employee_id:Number(payoutDraft.employee_id),amount:Number(payoutDraft.amount),method:payoutDraft.method,note:payoutDraft.note});setPayoutDraft({employee_id:"",amount:"",method:"cash",note:""});await loadOrders();}catch(err){setError(err instanceof Error?err.message:"Не удалось добавить выплату");}}
  async function reserveMaterial(orderId,itemId,quantity){try{await invokeCrmFunction("crm-admin",{action:"reserve_material",order_id:Number(orderId),inventory_item_id:Number(itemId),quantity:Number(quantity)});await loadOrders();if(selectedOrder?.id===orderId)await loadProduction(orderId);}catch(err){setError(err instanceof Error?err.message:"Не удалось зарезервировать материал");}}

  function getServiceDraft(service) {
    return serviceDrafts[service.id] || {
      name: service.name || "",
      description: service.description || "",
      base_price: service.base_price ?? "",
      is_active: service.is_active !== false,
    };
  }
  function updateServiceDraft(service, field, value) {
    setServiceDrafts((current) => ({
      ...current,
      [service.id]: { ...getServiceDraft(service), ...current[service.id], [field]: value },
    }));
  }
  async function saveService(service) {
    const draft = getServiceDraft(service);
    setSavingServiceId(service.id); setError("");
    try {
      await invokeCrmFunction("crm-admin", { action:"save_service", id:service.id, ...draft, base_price:Number(draft.base_price || 0) });
      setServiceDrafts((current) => { const next={...current}; delete next[service.id]; return next; });
      await loadOrders();
    } catch(err) { setError(err instanceof Error ? err.message : "Не удалось сохранить услугу"); }
    finally { setSavingServiceId(null); }
  }
  async function createService(event) {
    event.preventDefault(); setSavingServiceId("new"); setError("");
    try {
      await invokeCrmFunction("crm-admin", { action:"save_service", ...newService, base_price:Number(newService.base_price || 0) });
      setNewService({ name:"", description:"", base_price:"", is_active:true });
      await loadOrders();
    } catch(err) { setError(err instanceof Error ? err.message : "Не удалось добавить услугу"); }
    finally { setSavingServiceId(null); }
  }

  async function editCustomerQuick(customer) {
    const first_name=prompt("Имя",customer.first_name||""); if(first_name===null)return;
    const last_name=prompt("Фамилия",customer.last_name||""); if(last_name===null)return;
    const phone=prompt("Телефон",customer.phone||""); if(phone===null)return;
    const username=prompt("Telegram без @",customer.username||""); if(username===null)return;
    try { await invokeCrmFunction("crm-admin",{action:"update_customer",id:customer.id,first_name,last_name,phone,username}); setSelectedCustomer(null); await loadOrders(); } catch(err){setError(err instanceof Error?err.message:"Ошибка клиента");}
  }
  async function editVehicleQuick(vehicle) {
    const brand=prompt("Марка",vehicle.brand||""); if(brand===null)return; const model=prompt("Модель",vehicle.model||""); if(model===null)return;
    const year=prompt("Год",vehicle.year||""); if(year===null)return; const configuration=prompt("Конфигурация",vehicle.configuration||""); if(configuration===null)return;
    const license_plate=prompt("Госномер",vehicle.license_plate||""); if(license_plate===null)return; const vin=prompt("VIN",vehicle.vin||""); if(vin===null)return;
    try { await invokeCrmFunction("crm-admin",{action:"update_vehicle",id:vehicle.id,brand,model,year,configuration,license_plate,vin}); setSelectedVehicle(null); await loadOrders(); } catch(err){setError(err instanceof Error?err.message:"Ошибка автомобиля");}
  }

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesText = !q || [
        order.id, getCustomerName(order.customer), order.customer?.phone,
        getVehicleName(order.vehicle), order.vehicle?.license_plate,
      ].filter(Boolean).join(" ").toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || order.status === statusFilter;
      const matchesPriority = priorityFilter === "all" || (order.priority || "normal") === priorityFilter;
      const matchesView = viewFilter === "all" || (viewFilter === "new" ? !order.viewed_at : viewFilter === "reschedule" ? order.booking_status === "reschedule_requested" : !!order.viewed_at);
      return matchesText && matchesStatus && matchesPriority && matchesView;
    });
  }, [orders, search, statusFilter, priorityFilter, viewFilter]);

  const customers = useMemo(() => {
    const map = new Map();
    orders.forEach((order) => {
      const c = order.customer;
      if (!c) return;
      const key = c.id ?? `customer-${getCustomerName(c)}-${c.phone || ""}`;
      const current = map.get(key) || { ...c, ordersCount: 0, total: 0, lastOrder: null, orders: [] };
      current.ordersCount += 1;
      if (order.status !== "cancelled") current.total += orderAmount(order);
      current.orders.push(order);
      if (!current.lastOrder || new Date(order.created_at) > new Date(current.lastOrder.created_at)) current.lastOrder = order;
      map.set(key, current);
    });
    return [...map.values()].sort((a, b) => new Date(b.lastOrder?.created_at || 0) - new Date(a.lastOrder?.created_at || 0));
  }, [orders]);

  const vehicles = useMemo(() => {
    const map = new Map();
    orders.forEach((order) => {
      const v = order.vehicle;
      if (!v) return;
      const key = v.id ?? `vehicle-${v.brand}-${v.model}-${v.license_plate || ""}`;
      const current = map.get(key) || { ...v, customer: order.customer, ordersCount: 0, total: 0, lastOrder: null, orders: [] };
      current.ordersCount += 1;
      if (order.status !== "cancelled") current.total += orderAmount(order);
      current.orders.push(order);
      if (!current.lastOrder || new Date(order.created_at) > new Date(current.lastOrder.created_at)) current.lastOrder = order;
      map.set(key, current);
    });
    return [...map.values()].sort((a, b) => new Date(b.lastOrder?.created_at || 0) - new Date(a.lastOrder?.created_at || 0));
  }, [orders]);

  const scheduledOrders = useMemo(() => orders
    .filter((o) => o.scheduled_at && o.status !== "cancelled")
    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at)), [orders]);

  const calendarGroups = useMemo(() => {
    const groups = new Map();
    scheduledOrders.forEach((order) => {
      const d = new Date(order.scheduled_at);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(order);
    });
    return [...groups.entries()];
  }, [scheduledOrders]);

  const totalRevenue = orders.filter((o) => o.status !== "cancelled").reduce((sum, o) => sum + orderAmount(o), 0);
  const economicsByOrder = useMemo(() => new Map((adminData.economics || []).map((x)=>[Number(x.order_id), x])), [adminData.economics]);
  const paymentsByOrder = useMemo(() => { const map=new Map(); (adminData.payments||[]).forEach((p)=>{const id=Number(p.order_id); const arr=map.get(id)||[]; arr.push(p); map.set(id,arr);}); return map; }, [adminData.payments]);
  function getOrderPayments(order){ return paymentsByOrder.get(Number(order?.id))||[]; }
  function getOrderEconomics(order) {
    const saved = economicsByOrder.get(Number(order?.id)) || {};
    const materialCost = Number(saved.material_cost || 0);
    const laborCost = Number(saved.labor_cost || 0);
    const revenue = orderAmount(order || {});
    const cost = materialCost + laborCost;
    const profit = revenue - cost;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    const masterPay = Number(saved.master_pay || 0);
    const paid = getOrderPayments(order).reduce((sum,p)=>sum+Number(p.amount||0),0);
    const debt = Math.max(0,revenue-paid);
    return { revenue, materialCost, laborCost, masterPay, cost, profit, margin, paid, debt };
  }
  const businessEconomics = orders.filter((o)=>o.status!=="cancelled").reduce((acc,o)=>{ const e=getOrderEconomics(o); acc.materialCost+=e.materialCost; acc.laborCost+=e.laborCost; acc.masterPay+=e.masterPay; acc.cost+=e.cost; acc.profit+=e.profit; acc.paid+=e.paid; acc.debt+=e.debt; return acc; }, {materialCost:0,laborCost:0,masterPay:0,cost:0,profit:0,paid:0,debt:0});
  const businessMargin = totalRevenue > 0 ? (businessEconomics.profit / totalRevenue) * 100 : 0;
  const financePeriodStart = useMemo(() => {
    const d = new Date();
    if (financePeriod === "day") return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (financePeriod === "week") { const x=new Date(d.getFullYear(),d.getMonth(),d.getDate()); const day=(x.getDay()+6)%7; x.setDate(x.getDate()-day); return x; }
    if (financePeriod === "year") return new Date(d.getFullYear(),0,1);
    return new Date(d.getFullYear(),d.getMonth(),1);
  }, [financePeriod]);
  const periodPayments = useMemo(() => (adminData.payments||[]).filter((p)=>new Date(p.paid_at||p.created_at)>=financePeriodStart).sort((a,b)=>new Date(b.paid_at||b.created_at)-new Date(a.paid_at||a.created_at)), [adminData.payments, financePeriodStart]);
  const periodOrders = useMemo(() => orders.filter((o)=>o.status!=="cancelled" && new Date(o.created_at)>=financePeriodStart), [orders, financePeriodStart]);
  const periodPaid = periodPayments.reduce((s,p)=>s+Number(p.amount||0),0);
  const periodRevenue = periodOrders.reduce((s,o)=>s+orderAmount(o),0);
  const periodEconomics = periodOrders.reduce((a,o)=>{const e=getOrderEconomics(o);a.cost+=e.cost;a.profit+=e.profit;a.masterPay+=e.masterPay;return a;},{cost:0,profit:0,masterPay:0});
  const paymentMethodStats = useMemo(()=>{const labels={cash:"Наличные",card:"Карта",transfer:"Перевод",invoice:"Счёт"};const m=new Map();periodPayments.forEach(p=>m.set(p.method,(m.get(p.method)||0)+Number(p.amount||0)));return [...m.entries()].map(([key,value])=>({key,label:labels[key]||key,value})).sort((a,b)=>b.value-a.value);},[periodPayments]);
  const debtOrders = useMemo(()=>orders.filter(o=>o.status!=="cancelled"&&getOrderEconomics(o).debt>0).sort((a,b)=>getOrderEconomics(b).debt-getOrderEconomics(a).debt),[orders,adminData.economics,adminData.payments]);
  const masterFinance = useMemo(()=>(adminData.employees||[]).filter(m=>m.is_active&&m.role==="master").map(m=>{const own=orders.filter(o=>Number(o.assigned_employee_id||o.employee_id||0)===Number(m.id));const pay=own.reduce((s,o)=>s+getOrderEconomics(o).masterPay,0);const done=own.filter(o=>o.status==="done").length;return {master:m,orders:own.length,done,pay};}).sort((a,b)=>b.pay-a.pay),[adminData.employees,orders,adminData.economics]);

  const activeOrders = orders.filter((o) => !["done", "cancelled"].includes(o.status)).length;
  const rescheduleOrders = orders.filter((o) => o.booking_status === "reschedule_requested" && o.status !== "cancelled");
  const unreadOrders = orders.filter((o) => !o.viewed_at && o.status !== "cancelled");
  const staffPeriodStart=useMemo(()=>{const d=new Date();if(staffPeriod==="week"){const x=new Date(d.getFullYear(),d.getMonth(),d.getDate());x.setDate(x.getDate()-((x.getDay()+6)%7));return x;}if(staffPeriod==="year")return new Date(d.getFullYear(),0,1);return new Date(d.getFullYear(),d.getMonth(),1);},[staffPeriod]);
  const staffRows=useMemo(()=>(adminData.employees||[]).filter(x=>x.role==="master").map(m=>{const own=orders.filter(o=>Number(o.assigned_employee_id||o.employee_id||0)===Number(m.id));const periodOwn=own.filter(o=>new Date(o.updated_at||o.created_at)>=staffPeriodStart);const done=periodOwn.filter(o=>o.status==="done").length;const accrued=periodOwn.reduce((sum,o)=>sum+Number((adminData.economics||[]).find(e=>Number(e.order_id)===Number(o.id))?.master_pay||o.master_pay||0),0);const paid=(adminData.payouts||[]).filter(p=>Number(p.employee_id)===Number(m.id)&&new Date(p.paid_at)>=staffPeriodStart).reduce((a,p)=>a+Number(p.amount||0),0);const tasks=(crmTasks||[]).filter(t=>Number(t.assigned_employee_id)===Number(m.id));return {master:m,orders:periodOwn.length,done,accrued,paid,due:Math.max(0,accrued-paid),openTasks:tasks.filter(t=>!t.is_done).length};}),[adminData.employees,adminData.economics,adminData.payouts,orders,crmTasks,staffPeriodStart]);
  const reservedByItem=useMemo(()=>{const m=new Map();for(const r of adminData.reservations||[])m.set(Number(r.inventory_item_id),(m.get(Number(r.inventory_item_id))||0)+Number(r.quantity||0));return m;},[adminData.reservations]);
  const purchaseList=useMemo(()=>(adminData.inventory||[]).map(i=>({...i,reserved:reservedByItem.get(Number(i.id))||0,available:Number(i.quantity||0)-(reservedByItem.get(Number(i.id))||0)})).filter(i=>i.available<=Number(i.min_quantity||0)),[adminData.inventory,reservedByItem]);
  const activeMasters = adminData.employees.filter((x) => x.is_active && x.role === "master");
  const SERVICE_BAYS_COUNT = 2;
  const operationalAlerts = useMemo(() => {
    const alerts = [];
    orders.filter((o)=>o.booking_status === "reschedule_requested" && o.status !== "cancelled").forEach((o)=>alerts.push({key:`move-${o.id}`,kind:"move",title:`Клиент запросил перенос · заказ №${o.id}`,text:`${getVehicleName(o.vehicle)} · ${getCustomerName(o.customer)}`,order:o}));
    orders.filter((o)=>!o.viewed_at && o.status !== "cancelled").forEach((o)=>alerts.push({key:`new-${o.id}`,kind:"new",title:`Новая заявка · заказ №${o.id}`,text:`${getVehicleName(o.vehicle)} · ${getCustomerName(o.customer)}`,order:o}));
    crmTasks.filter((t)=>!t.is_done && t.due_at && new Date(t.due_at)<new Date()).forEach((t)=>{const o=orders.find((x)=>Number(x.id)===Number(t.order_id));alerts.push({key:`task-${t.id}`,kind:"task",title:`Просрочена задача · заказ №${t.order_id}`,text:t.title,order:o});});
    return alerts.slice(0,20);
  }, [orders, crmTasks]);
  const newOrders = orders.filter((o) => o.status === "new").length;
  const doneOrders = orders.filter((o) => o.status === "done").length;
  const upcoming = scheduledOrders.filter((o) => new Date(o.scheduled_at) >= new Date()).slice(0, 5);
  const recent = [...orders].sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);
  const cancelledOrders = orders.filter((o) => o.status === "cancelled");
  const nonCancelledOrders = orders.filter((o) => o.status !== "cancelled");
  const averageCheck = nonCancelledOrders.length ? totalRevenue / nonCancelledOrders.length : 0;
  const completionRate = nonCancelledOrders.length ? Math.round((doneOrders / nonCancelledOrders.length) * 100) : 0;
  const urgentOrders = orders.filter((o) => o.status !== "cancelled" && o.priority === "urgent");
  const highPriorityOrders = orders.filter((o) => o.status !== "cancelled" && o.priority === "high");
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart); todayEnd.setDate(todayEnd.getDate() + 1);
  const weekEnd = new Date(todayStart); weekEnd.setDate(weekEnd.getDate() + 7);
  const todayOrders = scheduledOrders.filter((o) => { const d = new Date(o.scheduled_at); return d >= todayStart && d < todayEnd; });
  const weekOrders = scheduledOrders.filter((o) => { const d = new Date(o.scheduled_at); return d >= todayStart && d < weekEnd; });
  const overdueOrders = scheduledOrders.filter((o) => new Date(o.scheduled_at) < now && !["done", "cancelled"].includes(o.status));
  const unseenOrders = orders.filter((o)=>!o.viewed_at && o.status!=="cancelled");
  const openCrmTasks = crmTasks.filter((t)=>!t.is_done);
  const overdueCrmTasks = openCrmTasks.filter((t)=>t.due_at && new Date(t.due_at)<now);
  const todayCrmTasks = openCrmTasks.filter((t)=>{if(!t.due_at)return false;const d=new Date(t.due_at);return d>=todayStart&&d<todayEnd;});
  const priorityCrmTasks = [...openCrmTasks].sort((a,b)=>{
    const ad=a.due_at?new Date(a.due_at).getTime():Number.MAX_SAFE_INTEGER;
    const bd=b.due_at?new Date(b.due_at).getTime():Number.MAX_SAFE_INTEGER;
    return ad-bd;
  }).slice(0,6);
  const launchChecklist = [
    { key:"company", label:"Название компании", done:Boolean(companySettings.company_name && companySettings.company_name !== "GarageFlow") },
    { key:"contacts", label:"Телефон или email компании", done:Boolean(companySettings.phone || companySettings.email) },
    { key:"services", label:"Каталог услуг", done:adminData.services.some((x)=>x.is_active!==false) },
    { key:"manager", label:"Активный менеджер", done:adminData.employees.some((x)=>x.is_active && ["admin","manager"].includes(x.role)) },
    { key:"master", label:"Активный мастер", done:adminData.employees.some((x)=>x.is_active && x.role==="master") },
    { key:"telegram", label:"Telegram сотрудников", done:adminData.employees.filter((x)=>x.is_active).some((x)=>x.telegram_chat_id) },
  ];
  const launchReadyCount = launchChecklist.filter((x)=>x.done).length;

  const sourceStats = useMemo(() => {
    const map = new Map();
    orders.forEach((o)=>{ const key=o.lead_source||"unknown"; const x=map.get(key)||{key,count:0,revenue:0,done:0}; x.count+=1; if(o.status!=="cancelled") x.revenue+=orderAmount(o); if(o.status==="done") x.done+=1; map.set(key,x); });
    return [...map.values()].sort((a,b)=>b.count-a.count);
  }, [orders]);
  const cancellationStats = useMemo(() => {
    const map=new Map(); cancelledOrders.forEach((o)=>{const key=o.cancellation_reason||"other";map.set(key,(map.get(key)||0)+1)}); return [...map.entries()].sort((a,b)=>b[1]-a[1]);
  }, [orders]);
  const overallConversion = orders.length ? Math.round((doneOrders/orders.length)*100) : 0;

  const serviceStats = useMemo(() => {
    const map = new Map();
    nonCancelledOrders.forEach((order) => (order.items || []).forEach((item) => {
      const key = item.service_name || "Без названия";
      const current = map.get(key) || { name: key, count: 0, revenue: 0 };
      current.count += Number(item.quantity || 1);
      current.revenue += Number(item.price || 0) * Number(item.quantity || 1);
      map.set(key, current);
    }));
    return [...map.values()].sort((a,b) => b.count - a.count).slice(0, 6);
  }, [orders]);

  const monthlyStats = useMemo(() => {
    const result = [];
    const base = new Date();
    for (let offset = 5; offset >= 0; offset--) {
      const d = new Date(base.getFullYear(), base.getMonth() - offset, 1);
      const year = d.getFullYear(), month = d.getMonth();
      const monthOrders = nonCancelledOrders.filter((o) => { const x = new Date(o.created_at); return x.getFullYear() === year && x.getMonth() === month; });
      result.push({
        key: `${year}-${month}`,
        label: new Intl.DateTimeFormat("ru-RU", { month: "short" }).format(d),
        orders: monthOrders.length,
        revenue: monthOrders.reduce((sum,o) => sum + orderAmount(o), 0),
        cost: monthOrders.reduce((sum,o) => sum + getOrderEconomics(o).cost, 0),
        profit: monthOrders.reduce((sum,o) => sum + getOrderEconomics(o).profit, 0),
      });
    }
    return result;
  }, [orders]);
  const maxMonthlyRevenue = Math.max(1, ...monthlyStats.map((m) => m.revenue));
  const funnel = columns.map((column) => ({ ...column, count: orders.filter((o) => o.status === column.key).length }));
  const maxFunnel = Math.max(1, ...funnel.map((item) => item.count));

  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const mondayOffset = (first.getDay() + 6) % 7;
    const cells = [];
    for (let i = 0; i < mondayOffset; i += 1) cells.push(null);
    for (let day = 1; day <= last.getDate(); day += 1) {
      const date = new Date(year, month, day);
      const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const dayOrders = scheduledOrders.filter((order) => {
        const d = new Date(order.scheduled_at);
        return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
      });
      cells.push({ date, key, day, orders: dayOrders });
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [calendarMonth, scheduledOrders]);

  const monthTitle = new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(calendarMonth);
  const calendarDateKey = (date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
  const weekStart = useMemo(() => { const d=new Date(calendarAnchor); const offset=(d.getDay()+6)%7; d.setHours(0,0,0,0); d.setDate(d.getDate()-offset); return d; }, [calendarAnchor]);
  const weekDays = useMemo(() => Array.from({length:7},(_,i)=>{ const date=new Date(weekStart); date.setDate(date.getDate()+i); const key=calendarDateKey(date); return {date,key,orders:scheduledOrders.filter((o)=>calendarDateKey(new Date(o.scheduled_at))===key)}; }), [weekStart, scheduledOrders]);
  const weekOperational = useMemo(() => weekDays.map((day) => {
    const bookings = [...day.orders].sort((a,b)=>new Date(a.scheduled_at)-new Date(b.scheduled_at));
    const lanes = Array.from({length:SERVICE_BAYS_COUNT},()=>[]);
    const conflicts = [];
    const placed = [];
    bookings.forEach((o)=>{
      const start = new Date(o.scheduled_at);
      const duration = Math.max(30, Number(o.service_duration_minutes || 120));
      const end = new Date(start.getTime()+duration*60000);
      const preferred = Number(o.service_bay || 0);
      const fits=(lane)=>lanes[lane].every((x)=>end<=x.start || start>=x.end);
      let lane = -1;
      if(preferred>=1 && preferred<=SERVICE_BAYS_COUNT){
        lane=preferred-1;
        if(!fits(lane)) conflicts.push({order:o,start,end});
      } else {
        lane=lanes.findIndex((_,idx)=>fits(idx));
        if(lane<0){ conflicts.push({order:o,start,end}); lane=0; }
      }
      const workStart = new Date(day.date); workStart.setHours(9,0,0,0);
      const workEnd = new Date(day.date); workEnd.setHours(20,0,0,0);
      const outsideHours = start < workStart || end > workEnd;
      const item={order:o,start,end,lane,conflict:conflicts.some((x)=>x.order.id===o.id),outsideHours};
      lanes[lane].push(item); placed.push(item);
    });
    let peak=0;
    for(let h=9;h<20;h+=0.5){const t=new Date(day.date);t.setHours(Math.floor(h),h%1?30:0,0,0);peak=Math.max(peak,placed.filter((x)=>x.start<=t&&x.end>t).length);}
    return {...day, bookings, lanes, placed, peak, conflicts};
  }), [weekDays]);
  const weekTitle = `${weekDays[0].date.toLocaleDateString("ru-RU",{day:"numeric",month:"short"})} — ${weekDays[6].date.toLocaleDateString("ru-RU",{day:"numeric",month:"short",year:"numeric"})}`;
  const unscheduledOrders = orders.filter((o)=>!o.scheduled_at && !["done","cancelled"].includes(o.status));
  const selectedDayOrders = selectedCalendarDay
    ? scheduledOrders.filter((o)=>calendarDateKey(new Date(o.scheduled_at))===selectedCalendarDay)
    : [];
  async function assignServiceBay(order, bay) {
    if (employee?.role === "master") return;
    try {
      const { data, error: rpcError } = await supabase.rpc("garageflow_set_service_bay", { p_order_id: Number(order.id), p_service_bay: bay ? Number(bay) : null });
      if (rpcError) throw rpcError;
      const updatedBay = data?.service_bay ?? (bay ? Number(bay) : null);
      setOrders((current)=>current.map((o)=>o.id===order.id?{...o,service_bay:updatedBay}:o));
      if(selectedOrder?.id===order.id) setSelectedOrder((current)=>current?{...current,service_bay:updatedBay}:current);
      setSaveMessage(bay ? `Заказ назначен на пост ${bay}` : "Пост снят");
    } catch(err) { setError(err?.message || "Не удалось назначить рабочий пост"); }
  }
  async function setServiceDuration(order, minutes) {
    if (employee?.role === "master") return;
    try {
      const value = Math.max(30, Number(minutes || 120));
      const { data, error: rpcError } = await supabase.rpc("garageflow_set_service_duration", { p_order_id: Number(order.id), p_minutes: value });
      if (rpcError) throw rpcError;
      const updatedDuration = Number(data?.service_duration_minutes || value);
      setOrders((current)=>current.map((o)=>o.id===order.id?{...o,service_duration_minutes:updatedDuration}:o));
      if(selectedOrder?.id===order.id) setSelectedOrder((current)=>current?{...current,service_duration_minutes:updatedDuration}:current);
      setSaveMessage(`Длительность записи: ${updatedDuration} мин.`);
    } catch(err) { setError(err?.message || "Не удалось изменить длительность записи"); }
  }
  function jumpCalendarToday(){ const d=new Date(); setCalendarAnchor(d); setCalendarMonth(new Date(d.getFullYear(),d.getMonth(),1)); setSelectedCalendarDay(calendarDateKey(d)); }
  function moveCalendar(direction){ if(calendarView==="week") setCalendarAnchor((d)=>{const n=new Date(d);n.setDate(n.getDate()+direction*7);return n;}); else {setCalendarMonth((d)=>new Date(d.getFullYear(),d.getMonth()+direction,1));setSelectedCalendarDay(null);} }
  const [pageTitle, pageSubtitle] = pageMeta[activePage] || pageMeta.overview;

  if (checkingAuth) return <div className="crmLoginPage"><div className="crmLoginCard"><div className="crmBrand">Garage<span>Flow</span></div><p>Проверяем сессию...</p></div></div>;
  if (!session) return (
    <div className="crmLoginPage"><form className="crmLoginCard" onSubmit={login}>
      <div className="crmBrand">Garage<span>Flow</span></div><div className="crmLoginSubtitle">CRM для сотрудников</div>
      <h1>Вход в систему</h1>
      <label>Email<input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="manager@company.ru" required /></label>
      <label>Пароль<input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="••••••••" required /></label>
      {loginError && <div className="crmError">{loginError}</div>}
      <button className="crmPrimaryButton" type="submit" disabled={loginLoading}>{loginLoading ? "Входим..." : "Войти"}</button>
    </form></div>
  );

  const allMenu = [
    ["overview", LayoutDashboard, "Обзор"], ["orders", ClipboardList, "Заказы"],
    ["customers", Users, "Клиенты"], ["vehicles", Car, "Автомобили"], ["calendar", CalendarDays, "Календарь"],
    ["analytics", BarChart3, "Аналитика"], ["finance", WalletCards, "Финансы"], ["staff", UserCog, "Персонал"], ["warehouse", Package, "Склад"], ["settings", Settings, "Настройки"],
  ];
  const rolePages = {
    admin: new Set(allMenu.map(([key])=>key)),
    manager: new Set(["overview","orders","customers","vehicles","calendar","analytics","finance","staff","warehouse","profile"]),
    master: new Set(["overview","orders","calendar","warehouse","profile"]),
  };
  const menu = allMenu.filter(([key]) => (rolePages[employee?.role] || rolePages.master).has(key));

  return (
    <div className="crm">
      <aside className="crmSidebar">
        <div className="crmBrand crmSidebarBrand">{companySettings.company_name || "GarageFlow"}</div>
        <div className="crmSidebarSubtitle">SERVICE CRM</div>
        <nav className="crmMenu">
          {menu.map(([key, Icon, label]) => (
            <button key={key} type="button" className={`crmMenuItem ${activePage === key ? "crmMenuItemActive" : ""}`} onClick={()=>{setActivePage(key); setSearch("");}}>
              <Icon size={19}/>{label}{key==="orders"&&unseenOrders.length>0&&<span className="crmMenuBadge">{unseenOrders.length}</span>}
            </button>
          ))}

        </nav>
        <div className="crmSidebarBottom">
          <div className="crmEmployee"><div className="crmAvatar"><UserRound size={19}/></div><div><strong>{employee?.display_name || "Сотрудник"}</strong><span>{roleLabels[employee?.role] || employee?.role}</span></div></div>
          <button className="crmLogout" type="button" onClick={logout}><LogOut size={18}/>Выйти</button>
        </div>
      </aside>

      <main className="crmMain">
        <header className="crmTopbar"><div><h1>{pageTitle}</h1><p>{pageSubtitle}</p></div>
          <div className="crmTopbarActions">
            <button type="button" className="crmMobileProfileButton" onClick={()=>setActivePage("profile")}><UserRound size={18}/><span>{employee?.display_name || "Профиль"}</span></button>
            <span className={`crmLiveState crmLiveState-${liveSync}`}>{liveSync === "live" ? "● Live" : liveSync === "fallback" ? "Авто 45с" : "Подключение…"}</span><button type="button" className="crmRefresh" onClick={loadOrders} disabled={loading}><RefreshCw size={18}/>Обновить</button>
          </div>
        </header>
        {error && <div className="crmError crmPageError">{error}</div>}
        {loading ? <div className="crmLoading">Загружаем данные...</div> : <>

          {activePage === "profile" && <section className="crmMobileProfilePage">
            <div className="crmPanel crmProfileCard">
              <div className="crmProfileAvatar"><UserRound size={30}/></div>
              <div className="crmProfileIdentity"><h2>{employee?.display_name || "Сотрудник"}</h2><p>{roleLabels[employee?.role] || employee?.role || "Сотрудник"}</p>{session?.user?.email && <span>{session.user.email}</span>}</div>
            </div>
            <button className="crmMobileLogoutButton" type="button" onClick={logout}><LogOut size={19}/>Выйти из аккаунта</button>
            <p className="crmMobileLogoutHint">После выхода откроется экран входа, где можно войти под другим сотрудником.</p>
          </section>}

          {activePage === "overview" && <>
            <section className="crmStats crmStatsFive">
              <div className="crmStat"><span>Новые заявки</span><strong>{newOrders}</strong></div>
              <div className="crmStat"><span>В работе</span><strong>{activeOrders}</strong></div>
              <div className="crmStat"><span>Завершено</span><strong>{doneOrders}</strong></div>
              {employee?.role !== "master" && <>
                <button type="button" className="crmStat crmV21StatButton" onClick={()=>setActivePage("finance")}><span>Выручка</span><strong>{formatPrice(totalRevenue)}</strong></button>
                <div className="crmStat"><span>Себестоимость</span><strong>{formatPrice(businessEconomics.cost)}</strong></div>
                <button type="button" className="crmStat crmV21StatButton" onClick={()=>setActivePage("finance")}><span>Валовая прибыль</span><strong>{formatPrice(businessEconomics.profit)}</strong></button>
                <div className="crmStat"><span>Маржа</span><strong>{businessMargin.toFixed(1)}%</strong></div>
              </>}
            </section>
            <section className="crmAttentionGrid">
              <button type="button" className={`crmAttentionCard ${todayOrders.length ? "crmAttentionCardActive" : ""}`} onClick={()=>setActivePage("calendar")}><CalendarCheck size={21}/><div><span>Сегодня</span><strong>{todayOrders.length} записей</strong></div></button>
              <button type="button" className={`crmAttentionCard ${weekOrders.length ? "crmAttentionCardActive" : ""}`} onClick={()=>setActivePage("calendar")}><CalendarDays size={21}/><div><span>Ближайшие 7 дней</span><strong>{weekOrders.length} записей</strong></div></button>
              <button type="button" className={`crmAttentionCard ${overdueOrders.length ? "crmAttentionCardWarning" : ""}`} onClick={()=>setActivePage("orders")}><AlertTriangle size={21}/><div><span>Требуют внимания</span><strong>{overdueOrders.length} просрочено</strong></div></button>
              <button type="button" className={`crmAttentionCard ${urgentOrders.length ? "crmAttentionCardUrgent" : ""}`} onClick={()=>{setActivePage("orders");setPriorityFilter("urgent");}}><TrendingUp size={21}/><div><span>Срочные</span><strong>{urgentOrders.length} заказов</strong></div></button>
              <button type="button" className={`crmAttentionCard ${unseenOrders.length ? "crmAttentionCardActive" : ""}`} onClick={()=>{setActivePage("orders");setViewFilter("new");}}><ClipboardList size={21}/><div><span>Новые заявки</span><strong>{unseenOrders.length} не просмотрено</strong></div></button><button type="button" className={`crmAttentionCard ${rescheduleOrders.length ? "crmAttentionCardWarning" : ""}`} onClick={()=>{setActivePage("orders");setViewFilter("reschedule");}}><CalendarClock size={21}/><div><span>Запросы переноса</span><strong>{rescheduleOrders.length} требуют решения</strong></div></button>
              <button type="button" className={`crmAttentionCard ${overdueCrmTasks.length ? "crmAttentionCardWarning" : ""}`} onClick={()=>setActivePage("orders")}><AlertTriangle size={21}/><div><span>Задачи</span><strong>{todayCrmTasks.length} сегодня · {overdueCrmTasks.length} просрочено</strong></div></button>
            </section>
            <section className="crmFunnelPanel">
              <div className="crmPanelHeader"><div><h2>Воронка заказов</h2><p>Распределение по текущим статусам</p></div><BarChart3 size={20}/></div>
              <div className="crmFunnel">{funnel.map((item)=><div className="crmFunnelItem" key={item.key}><div className="crmFunnelTop"><span>{item.label}</span><strong>{item.count}</strong></div><div className="crmFunnelTrack"><div className="crmFunnelFill" style={{width:`${Math.max(item.count ? 12 : 0, (item.count/maxFunnel)*100)}%`}}/></div></div>)}</div>
            </section>
            <section className="crmPanel crmV19Alerts">
              <div className="crmPanelHeader"><div><h2>Центр уведомлений</h2><p>Новые заявки, переносы и просроченные задачи</p></div><div className="crmV19AlertCount"><Bell size={18}/><strong>{operationalAlerts.length}</strong></div></div>
              <div className="crmV19AlertList">{operationalAlerts.length ? operationalAlerts.slice(0,6).map((alert)=><button type="button" key={alert.key} className={`crmV19Alert crmV19Alert-${alert.kind}`} onClick={()=>alert.order&&goToOrder(alert.order)}><span className="crmV19AlertIcon">{alert.kind==="move"?"↪":alert.kind==="task"?"!":"+"}</span><div><strong>{alert.title}</strong><small>{alert.text}</small></div><ChevronRight size={17}/></button>) : <div className="crmEmptyState">Новых уведомлений нет</div>}</div>
            </section>
            <section className="crmDashboardGrid">
              <div className="crmPanel"><div className="crmPanelHeader"><div><h2>Ближайшие записи</h2><p>Назначенные работы</p></div><CalendarClock size={20}/></div>
                <div className="crmList">{upcoming.length ? upcoming.map((o)=><button className="crmListRow" key={o.id} onClick={()=>goToOrder(o)}><div className="crmListIcon"><CalendarDays size={18}/></div><div className="crmListMain"><strong>{getVehicleName(o.vehicle)}</strong><span>{getCustomerName(o.customer)} · {formatDate(o.scheduled_at)}</span></div><ChevronRight size={18}/></button>) : <div className="crmEmptyState">Ближайших записей пока нет</div>}</div>
              </div>
              <div className="crmPanel"><div className="crmPanelHeader"><div><h2>Последние заказы</h2><p>Недавняя активность</p></div><ClipboardList size={20}/></div>
                <div className="crmList">{recent.map((o)=><button className="crmListRow" key={o.id} onClick={()=>goToOrder(o)}><div className="crmListIcon"><Hash size={18}/></div><div className="crmListMain"><strong>Заказ №{o.id} · {getVehicleName(o.vehicle)}</strong><span>{statusLabels[o.status] || o.status} · {formatPrice(orderAmount(o))}</span></div><ChevronRight size={18}/></button>)}</div>
              </div>
            </section>
            <section className="crmPanel crmMyTasksPanel">
              <div className="crmPanelHeader"><div><h2>{employee?.role === "master" ? "Мои задачи" : "Задачи команды"}</h2><p>Ближайшие незавершённые задачи · просрочено {overdueCrmTasks.length}</p></div><CheckCircle2 size={20}/></div>
              <div className="crmV15TaskList">{priorityCrmTasks.length ? priorityCrmTasks.map((task)=>{const order=orders.find((o)=>Number(o.id)===Number(task.order_id));const overdue=task.due_at&&new Date(task.due_at)<now;return <button type="button" key={task.id} className={`crmV15Task ${overdue?"crmV15TaskOverdue":""}`} onClick={()=>order&&goToOrder(order)}><span className="crmV15TaskCheck">○</span><div><strong>{task.title}</strong><small>Заказ №{task.order_id}{task.assignee?.display_name?` · ${task.assignee.display_name}`:""}{task.due_at?` · до ${formatDate(task.due_at)}`:""}</small></div><ChevronRight size={17}/></button>}) : <div className="crmEmptyState">Открытых задач нет</div>}</div>
            </section>
            <section className="crmQuickGrid">
              <button onClick={()=>setActivePage("orders")}><Wrench size={21}/><div><strong>Открыть заказы</strong><span>Kanban и карточки работ</span></div><ArrowRight size={18}/></button>
              {employee?.role !== "master" && <button onClick={()=>setActivePage("customers")}><Users size={21}/><div><strong>База клиентов</strong><span>{customers.length} клиентов</span></div><ArrowRight size={18}/></button>}
              <button onClick={()=>setActivePage("calendar")}><CalendarClock size={21}/><div><strong>Календарь</strong><span>{scheduledOrders.length} записей</span></div><ArrowRight size={18}/></button>
            </section>
          </>}

          {activePage === "orders" && <>
            <section className="crmStats"><div className="crmStat"><span>{employee?.role === "master" ? "Мои заказы" : "Всего заказов"}</span><strong>{orders.length}</strong></div><div className="crmStat"><span>В работе</span><strong>{activeOrders}</strong></div><div className="crmStat"><span>Завершено</span><strong>{doneOrders}</strong></div>{employee?.role !== "master" && <div className="crmStat"><span>Сумма заказов</span><strong>{formatPrice(totalRevenue)}</strong></div>}</section>
            <section className="crmToolbar crmToolbarSplit"><div className="crmSearch"><Search size={18}/><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Поиск по клиенту, автомобилю, номеру..."/></div><div className="crmOrderFilters"><select value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value)}><option value="all">Все статусы</option>{columns.map((c)=><option key={c.key} value={c.key}>{c.label}</option>)}</select><select value={priorityFilter} onChange={(e)=>setPriorityFilter(e.target.value)}><option value="all">Все приоритеты</option><option value="normal">Обычный</option><option value="high">Высокий</option><option value="urgent">Срочный</option></select><select value={viewFilter} onChange={(e)=>setViewFilter(e.target.value)}><option value="all">Все заявки</option><option value="new">Непросмотренные</option><option value="viewed">Просмотренные</option></select>{employee?.role !== "master" && <><button className={`crmFilterButton ${showCancelled ? "crmFilterButtonActive" : ""}`} type="button" onClick={()=>setShowCancelled((value)=>!value)}>Отменённые <span>{cancelledOrders.length}</span><ChevronDown size={16}/></button><button className="crmCreateButton" type="button" onClick={()=>setShowCreateOrder(true)}><Plus size={17}/>Новый заказ</button></>}</div></section>
            {showCancelled && <section className="crmCancelledPanel"><div className="crmPanelHeader"><div><h2>Отменённые заказы</h2><p>История отменённых заявок</p></div></div><div className="crmList">{cancelledOrders.length ? cancelledOrders.map((o)=><button className="crmListRow" key={o.id} onClick={()=>openOrder(o)}><div className="crmListIcon"><Hash size={18}/></div><div className="crmListMain"><strong>Заказ №{o.id} · {getVehicleName(o.vehicle)}</strong><span>{getCustomerName(o.customer)} · {formatPrice(orderAmount(o))}</span></div><ChevronRight size={18}/></button>) : <div className="crmEmptyState">Отменённых заказов нет</div>}</div></section>}
            <div className="crmMobileStatusTabs">{columns.map((column)=>{const count=filteredOrders.filter((o)=>o.status===column.key).length;return <button type="button" key={column.key} className={mobileOrderStatus===column.key?"active":""} onClick={()=>setMobileOrderStatus(column.key)}><span>{column.label}</span><b>{count}</b></button>})}</div>
            <section className="crmBoard">{columns.map((column)=>{const columnOrders=filteredOrders.filter((o)=>o.status===column.key); return <div className={`crmColumn ${mobileOrderStatus===column.key?"crmMobileColumnActive":""}`} key={column.key}><div className="crmColumnHeader"><span>{column.label}</span><strong>{columnOrders.length}</strong></div><div className="crmColumnCards">{columnOrders.map((o)=><article key={o.id} className="crmOrderCard" onClick={()=>openOrder(o)}><div className="crmOrderTop"><span>Заказ №{o.id}{!o.viewed_at&&<b className="crmNewBadge">НОВАЯ</b>}{o.booking_status==="reschedule_requested"&&<b className="crmMoveBadge">↪ ПЕРЕНОС</b>}</span><div className="crmOrderTopRight">{o.priority && o.priority!=="normal" && <span className={`crmPriorityBadge crmPriority-${o.priority}`}>{o.priority==="urgent"?"Срочный":"Высокий"}</span>}<ChevronRight size={17}/></div></div><h3>{getVehicleName(o.vehicle)}</h3><p className="crmCustomerName">{getCustomerName(o.customer)}</p><div className="crmServices">{o.items?.map((i)=>i.service_name).join(" • ")}</div>{o.scheduled_at&&<div className="crmOrderSchedule"><Clock3 size={14}/>{formatDate(o.scheduled_at)}</div>}<div className="crmOrderBottom">{employee?.role !== "master" && <strong>{formatPrice(orderAmount(o))}</strong>}<span>{formatDate(o.created_at)}</span></div></article>)}{!columnOrders.length&&<div className="crmEmptyColumn">Нет заказов</div>}</div></div>})}</section>
          </>}

          {activePage === "customers" && <section className="crmDataSection">
            <div className="crmToolbar"><div className="crmSearch"><Search size={18}/><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Поиск клиента..."/></div></div>
            <div className="crmDataGrid">{customers.filter((c)=>!search.trim() || [getCustomerName(c),c.phone,c.username].filter(Boolean).join(" ").toLowerCase().includes(search.toLowerCase())).map((c)=><button className="crmDataCard crmDataCardButton" key={c.id ?? getCustomerName(c)} onClick={()=>setSelectedCustomer(c)}><div className="crmDataCardHead"><div className="crmDataAvatar"><UserRound size={20}/></div><div><h3>{getCustomerName(c)}</h3><span>{c.ordersCount} заказ(а)</span></div></div><div className="crmDataInfo">{c.phone&&<div><Phone size={15}/>{c.phone}</div>}{c.username&&<div><AtSign size={15}/>@{c.username}</div>}<div><CircleDollarSign size={15}/>{formatPrice(c.total)}</div></div><div className="crmCardLink">Открыть карточку клиента<ChevronRight size={16}/></div></button>)}</div>
          </section>}

          {activePage === "vehicles" && <section className="crmDataSection">
            <div className="crmToolbar"><div className="crmSearch"><Search size={18}/><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Поиск автомобиля или госномера..."/></div></div>
            <div className="crmDataGrid">{vehicles.filter((v)=>!search.trim() || [getVehicleName(v),v.license_plate,v.vin,getCustomerName(v.customer)].filter(Boolean).join(" ").toLowerCase().includes(search.toLowerCase())).map((v)=><button className="crmDataCard crmDataCardButton" key={v.id ?? getVehicleName(v)} onClick={()=>setSelectedVehicle(v)}><div className="crmDataCardHead"><div className="crmDataAvatar"><Car size={20}/></div><div><h3>{getVehicleName(v)}</h3><span>{v.year || "Год не указан"}</span></div></div><div className="crmDataInfo"><div><UserRound size={15}/>{getCustomerName(v.customer)}</div>{v.license_plate&&<div><Hash size={15}/>{v.license_plate}</div>}<div><ClipboardList size={15}/>{v.ordersCount} заказ(а)</div><div><CircleDollarSign size={15}/>{formatPrice(v.total)}</div></div><div className="crmCardLink">Открыть карточку автомобиля<ChevronRight size={16}/></div></button>)}</div>
          </section>}

          {activePage === "calendar" && <section className="crmMonthSection crmCalendarV14">
            <div className="crmCalendarSummary"><div><span>Сегодня</span><strong>{todayOrders.length}</strong></div><div><span>Ближайшие 7 дней</span><strong>{weekOrders.length}</strong></div><div><span>Без записи</span><strong>{unscheduledOrders.length}</strong></div><div className={overdueOrders.length?"crmCalendarAlert":""}><span>Просроченные</span><strong>{overdueOrders.length}</strong></div></div>
            <div className="crmCalendarControlBar"><div className="crmCalendarViewSwitch"><button className={calendarView==="week"?"active":""} onClick={()=>setCalendarView("week")}>Неделя</button><button className={calendarView==="month"?"active":""} onClick={()=>setCalendarView("month")}>Месяц</button></div><button className="crmTodayButton" onClick={jumpCalendarToday}>Сегодня</button></div>
            <div className="crmV19OpsSwitch"><button type="button" className={calendarOpsView==="schedule"?"active":""} onClick={()=>setCalendarOpsView("schedule")}>Расписание</button><button type="button" className={calendarOpsView==="load"?"active":""} onClick={()=>setCalendarOpsView("load")}><Gauge size={16}/> Загрузка</button></div>
            {calendarOpsView === "load" && <div className="crmV19Workload">
              <div className="crmV19Capacity"><div><span>Рабочих постов</span><strong>{SERVICE_BAYS_COUNT}</strong></div><div><span>Активных мастеров</span><strong>{activeMasters.length}</strong></div><div><span>Записей на неделе</span><strong>{weekOperational.reduce((sum,d)=>sum+d.bookings.length,0)}</strong></div><div><span>Конфликтов</span><strong>{weekOperational.reduce((sum,d)=>sum+d.conflicts.length,0)}</strong></div></div>
              <div className="crmV191Legend"><span><i/>Рабочее время 09:00–20:00</span><span><i className="busy"/>Запись</span><span><i className="danger"/>Пересечение</span><small>Длительность по умолчанию — 2 часа</small></div>
              <div className="crmV191Timeline">{weekOperational.map((day)=><div className={`crmV191Day ${day.conflicts.length?"hasConflict":""}`} key={day.key}><div className="crmV19LoadHead"><div><strong>{day.date.toLocaleDateString("ru-RU",{weekday:"short",day:"numeric"})}</strong><span>{day.bookings.length} запис.</span></div><b className={day.conflicts.length?"danger":day.peak>=SERVICE_BAYS_COUNT?"busy":""}>{day.peak}/{SERVICE_BAYS_COUNT}</b></div><div className="crmV191Scale"><span>09</span><span>11</span><span>13</span><span>15</span><span>17</span><span>19</span><span>20</span></div>{day.lanes.map((lane,laneIndex)=><div className="crmV191Bay" key={laneIndex}><div className="crmV191BayName">Пост {laneIndex+1}</div><div className="crmV191Track">{lane.map((item)=>{const startMin=item.start.getHours()*60+item.start.getMinutes();const endMin=item.end.getHours()*60+item.end.getMinutes();const rawLeft=((startMin-540)/660)*100;const left=Math.max(0,Math.min(96,rawLeft));const visibleEnd=Math.min(1200,Math.max(540,endMin));const visibleStart=Math.min(1200,Math.max(540,startMin));const width=Math.max(4,Math.min(100-left,((visibleEnd-visibleStart)/660)*100));return <button type="button" title={`${getVehicleName(item.order.vehicle)} · ${item.start.toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"})} · ${Number(item.order.service_duration_minutes||120)} мин.`} className={`crmV191Booking ${item.conflict?"conflict":""} ${item.outsideHours?"outside":""}`} style={{left:`${left}%`,width:`${width}%`}} key={item.order.id} onClick={()=>goToOrder(item.order)}><strong>{item.start.toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"})}</strong><span>{getVehicleName(item.order.vehicle)}</span></button>})}</div></div>)}{day.bookings.length>0&&employee?.role!=="master"&&<div className="crmV191Assignments">{day.bookings.map((o)=><div className="crmV192Assignment" key={o.id}><button type="button" onClick={()=>goToOrder(o)}><strong>№{o.id} · {getVehicleName(o.vehicle)}</strong><small>{new Date(o.scheduled_at).toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"})}</small></button><label>Пост<select value={o.service_bay||""} onChange={(e)=>assignServiceBay(o,e.target.value)}><option value="">Авто</option>{Array.from({length:SERVICE_BAYS_COUNT},(_,i)=><option value={i+1} key={i+1}>Пост {i+1}</option>)}</select></label><label>Длительность<select value={Number(o.service_duration_minutes||120)} onChange={(e)=>setServiceDuration(o,e.target.value)}>{[30,60,90,120,180,240,360,480].map((m)=><option value={m} key={m}>{m<60?`${m} мин`:`${m/60} ч${m%60?"":""}`}</option>)}</select></label></div>)}</div>}{day.placed.some((x)=>x.outsideHours)&&<div className="crmV192Outside"><Clock3 size={15}/> Есть запись вне рабочего окна 09:00–20:00 или работа выходит за его пределы.</div>}{day.conflicts.length>0&&<div className="crmV19Conflict"><AlertTriangle size={15}/> Пересечение: {day.conflicts.length} {day.conflicts.length===1?"запись":"записи"}. Назначьте другой пост или время.</div>}</div>)}</div>
              <div className="crmV19MasterLoad"><h3>Загрузка мастеров</h3><div>{activeMasters.map((master)=>{const tasks=crmTasks.filter((t)=>!t.is_done&&Number(t.assigned_employee_id)===Number(master.id));return <div className="crmV19MasterRow" key={master.id}><span><strong>{master.display_name}</strong><small>{tasks.length} открытых задач</small></span><b className={tasks.length>=5?"danger":tasks.length>=3?"busy":""}>{tasks.length}</b></div>})}{!activeMasters.length&&<div className="crmEmptyState">Активных мастеров нет</div>}</div></div>
            </div>}
            <div className="crmMonthToolbar"><button type="button" onClick={()=>moveCalendar(-1)}><ChevronLeft size={18}/></button><h2>{calendarView==="week"?weekTitle:monthTitle}</h2><button type="button" onClick={()=>moveCalendar(1)}><ChevronRight size={18}/></button></div>
            {calendarView === "week" ? <div className="crmWeekPlanner">{weekDays.map((cell)=>{const isToday=cell.key===calendarDateKey(new Date());return <button type="button" key={cell.key} className={`crmWeekPlannerDay ${isToday?"crmWeekPlannerToday":""} ${selectedCalendarDay===cell.key?"crmWeekPlannerSelected":""}`} onClick={()=>setSelectedCalendarDay(cell.key)}><div className="crmWeekPlannerHead"><span>{cell.date.toLocaleDateString("ru-RU",{weekday:"short"})}</span><strong>{cell.date.getDate()}</strong>{cell.orders.length > 0 && <b>{cell.orders.length}</b>}</div><div className="crmWeekPlannerEvents">{cell.orders.length?cell.orders.map((o)=><div className={`crmWeekPlannerEvent crmBooking-${o.booking_status||"none"}`} key={o.id}><time>{new Intl.DateTimeFormat("ru-RU",{hour:"2-digit",minute:"2-digit"}).format(new Date(o.scheduled_at))}</time><strong>{getVehicleName(o.vehicle)}</strong><span>{getCustomerName(o.customer)}</span><small>{o.booking_status==="confirmed"?"Запись подтверждена":o.booking_status==="scheduled"?"Ждём клиента":o.booking_status==="reschedule_requested"?"Перенос":statusLabels[o.status]||o.status}</small></div>):<div className="crmWeekPlannerEmpty">Свободно</div>}</div></button>})}</div> : <><div className="crmWeekdays">{["Пн","Вт","Ср","Чт","Пт","Сб","Вс"].map((day)=><span key={day}>{day}</span>)}</div><div className="crmMonthGrid">{calendarDays.map((cell,index)=>cell ? <button type="button" key={cell.key} className={`crmMonthDay ${cell.orders.length ? "crmMonthDayBusy" : ""} ${selectedCalendarDay===cell.key ? "crmMonthDaySelected" : ""}`} onClick={()=>setSelectedCalendarDay(cell.key)}><span className="crmMonthNumber">{cell.day}{cell.orders.length>0&&<b className={`crmLoadBadge ${cell.orders.length>=4?"crmLoadHigh":cell.orders.length>=2?"crmLoadMedium":""}`}>{cell.orders.length}</b>}</span>{cell.orders.slice(0,2).map((o)=><span className={`crmMonthEvent crmBooking-${o.booking_status||"none"}`} key={o.id}>{new Intl.DateTimeFormat("ru-RU",{hour:"2-digit",minute:"2-digit"}).format(new Date(o.scheduled_at))} · {getVehicleName(o.vehicle)}</span>)}{cell.orders.length>2&&<small>+ ещё {cell.orders.length-2}</small>}</button> : <div className="crmMonthDay crmMonthDayEmpty" key={`empty-${index}`}/>)}</div></>}
            <div className="crmDayAgenda"><div className="crmPanelHeader"><div><h2>{selectedCalendarDay ? `План на ${new Date(`${selectedCalendarDay}T12:00:00`).toLocaleDateString("ru-RU")}` : "Выберите день"}</h2><p>{selectedCalendarDay ? `${selectedDayOrders.length} записей` : "Нажмите на день в календаре"}</p></div><CalendarClock size={20}/></div>{selectedCalendarDay && <div className="crmList">{selectedDayOrders.length ? selectedDayOrders.map((o)=><button className="crmListRow" key={o.id} onClick={()=>goToOrder(o)}><div className="crmCalendarTime">{new Intl.DateTimeFormat("ru-RU",{hour:"2-digit",minute:"2-digit"}).format(new Date(o.scheduled_at))}</div><div className="crmListMain"><strong>{getVehicleName(o.vehicle)}</strong><span>{getCustomerName(o.customer)} · Заказ №{o.id}</span></div><div className="crmCalendarStatus">{statusLabels[o.status]||o.status}</div><ChevronRight size={18}/></button>) : <div className="crmEmptyState">На этот день записей нет</div>}</div>}</div>
          </section>}

          {activePage === "finance" && employee?.role !== "master" && <section className="crmDataSection crmV21FinancePage">
            <div className="crmV21Period"><strong>Период</strong>{[["day","Сегодня"],["week","Неделя"],["month","Месяц"],["year","Год"]].map(([k,l])=><button type="button" key={k} className={financePeriod===k?"active":""} onClick={()=>setFinancePeriod(k)}>{l}</button>)}</div>
            <section className="crmStats crmV21FinanceStats">
              <div className="crmStat"><span>Продано работ</span><strong>{formatPrice(periodRevenue)}</strong></div>
              <div className="crmStat"><span>Поступило в кассу</span><strong>{formatPrice(periodPaid)}</strong></div>
              <button type="button" className="crmStat crmV21StatButton crmV21DebtStat" onClick={()=>document.getElementById("crm-v21-debts")?.scrollIntoView({behavior:"smooth"})}><span>Долги клиентов</span><strong>{formatPrice(businessEconomics.debt)}</strong></button>
              <div className="crmStat"><span>Себестоимость</span><strong>{formatPrice(periodEconomics.cost)}</strong></div>
              <div className="crmStat"><span>Валовая прибыль</span><strong>{formatPrice(periodEconomics.profit)}</strong></div>
              <div className="crmStat"><span>Начислено мастерам</span><strong>{formatPrice(periodEconomics.masterPay)}</strong></div>
            </section>
            <div className="crmAnalyticsGrid">
              <div className="crmPanel"><div className="crmPanelHeader"><div><h2>Касса</h2><p>Платежи за выбранный период</p></div><Banknote size={20}/></div><div className="crmV21MethodList">{paymentMethodStats.length?paymentMethodStats.map(x=><div key={x.key}><span>{x.label}</span><strong>{formatPrice(x.value)}</strong></div>):<div className="crmEmptyState">Платежей за период нет</div>}</div></div>
              <div className="crmPanel"><div className="crmPanelHeader"><div><h2>Начисления мастерам</h2><p>По назначенным заказам</p></div><Users size={20}/></div><div className="crmV21MethodList">{masterFinance.length?masterFinance.map(x=><div key={x.master.id}><span><b>{x.master.display_name||`Мастер #${x.master.id}`}</b><small>{x.orders} заказ. · {x.done} готово</small></span><strong>{formatPrice(x.pay)}</strong></div>):<div className="crmEmptyState">Активных мастеров нет</div>}</div></div>
            </div>
            <div className="crmPanel crmV21Journal"><div className="crmPanelHeader"><div><h2>Журнал платежей</h2><p>{periodPayments.length} операций за период</p></div><WalletCards size={20}/></div><div className="crmV21Table">{periodPayments.length?periodPayments.map(p=>{const o=orders.find(x=>Number(x.id)===Number(p.order_id));return <button type="button" key={p.id} onClick={()=>o&&goToOrder(o)}><span>{formatDate(p.paid_at||p.created_at)}</span><span><b>Заказ №{p.order_id}</b><small>{o?`${getVehicleName(o.vehicle)} · ${getCustomerName(o.customer)}`:""}</small></span><span>{({cash:"Наличные",card:"Карта",transfer:"Перевод",invoice:"Счёт"})[p.method]||p.method}</span><strong>{formatPrice(p.amount)}</strong><ChevronRight size={16}/></button>}):<div className="crmEmptyState">Платежей за выбранный период нет</div>}</div></div>
            <div id="crm-v21-debts" className="crmPanel crmV21Journal"><div className="crmPanelHeader"><div><h2>Долги клиентов</h2><p>Заказы с неоплаченным остатком</p></div><AlertTriangle size={20}/></div><div className="crmV21Table">{debtOrders.length?debtOrders.map(o=><button type="button" key={o.id} onClick={()=>goToOrder(o)}><span>№{o.id}</span><span><b>{getVehicleName(o.vehicle)}</b><small>{getCustomerName(o.customer)}</small></span><span>Оплачено {formatPrice(getOrderEconomics(o).paid)}</span><strong>{formatPrice(getOrderEconomics(o).debt)}</strong><ChevronRight size={16}/></button>):<div className="crmEmptyState">Задолженности нет</div>}</div></div>
          </section>}

          {activePage === "staff" && employee?.role !== "master" && <section className="crmDataSection crmV22Staff"><div className="crmV21Period"><strong>Период</strong>{[["week","Неделя"],["month","Месяц"],["year","Год"]].map(([k,l])=><button type="button" key={k} className={staffPeriod===k?"active":""} onClick={()=>setStaffPeriod(k)}>{l}</button>)}</div><div className="crmV22StaffGrid">{staffRows.map(r=><div className="crmPanel crmV22MasterCard" key={r.master.id}><div className="crmPanelHeader"><div><h2>{r.master.display_name}</h2><p>{r.orders} заказов · {r.done} завершено · {r.openTasks} задач</p></div><UserCog size={20}/></div><div className="crmV22Money"><span>Начислено<strong>{formatPrice(r.accrued)}</strong></span><span>Выплачено<strong>{formatPrice(r.paid)}</strong></span><span className={r.due>0?"due":""}>К выплате<strong>{formatPrice(r.due)}</strong></span></div></div>)}</div>{employee?.role==="admin"&&<form className="crmPanel crmV22Payout" onSubmit={addPayout}><div className="crmPanelHeader"><div><h2>Выплата мастеру</h2><p>Фиксируется в истории зарплаты</p></div><Banknote size={20}/></div><select required value={payoutDraft.employee_id} onChange={e=>setPayoutDraft({...payoutDraft,employee_id:e.target.value})}><option value="">Выберите мастера</option>{staffRows.map(r=><option key={r.master.id} value={r.master.id}>{r.master.display_name}</option>)}</select><input required type="number" min="1" placeholder="Сумма, ₽" value={payoutDraft.amount} onChange={e=>setPayoutDraft({...payoutDraft,amount:e.target.value})}/><select value={payoutDraft.method} onChange={e=>setPayoutDraft({...payoutDraft,method:e.target.value})}><option value="cash">Наличные</option><option value="card">Карта</option><option value="transfer">Перевод</option></select><input placeholder="Комментарий" value={payoutDraft.note} onChange={e=>setPayoutDraft({...payoutDraft,note:e.target.value})}/><button className="crmCreateButton">Добавить выплату</button></form>}<div className="crmPanel"><div className="crmPanelHeader"><div><h2>История выплат</h2><p>{(adminData.payouts||[]).length} операций</p></div></div><div className="crmV22History">{(adminData.payouts||[]).map(p=>{const m=(adminData.employees||[]).find(e=>Number(e.id)===Number(p.employee_id));return <div key={p.id}><span><strong>{m?.display_name||"Мастер"}</strong><small>{formatDate(p.paid_at)} · {p.method}</small></span><b>{formatPrice(p.amount)}</b></div>})}</div></div></section>}
          {activePage === "warehouse" && <section className="crmDataSection"><div className="crmV4Grid"><div className="crmPanel"><div className="crmPanelHeader"><div><h2>Остатки материалов</h2><p>{adminData.inventory.length} позиций</p></div><Boxes size={20}/></div><div className="crmInventoryList">{adminData.inventory.length ? adminData.inventory.map((item)=><div className={`crmInventoryRow ${Number(item.quantity)<=Number(item.min_quantity)?"crmInventoryLow":""}`} key={item.id}><div><strong>{item.name}</strong><span>{formatPrice(item.price)} / {item.unit}</span></div><div><span>Остаток</span><strong>{item.quantity} {item.unit}</strong></div><div><span>Минимум</span><strong>{item.min_quantity} {item.unit}</strong></div></div>) : <div className="crmEmptyState">Добавьте первый материал</div>}</div></div><form className="crmPanel crmV4Form" onSubmit={saveInventory}><div className="crmPanelHeader"><div><h2>Добавить материал</h2><p>Контроль складских остатков</p></div><Plus size={20}/></div><label>Название<input required value={inventoryForm.name} onChange={(e)=>setInventoryForm({...inventoryForm,name:e.target.value})}/></label><div className="crmFormRow"><label>Ед. изм.<input value={inventoryForm.unit} onChange={(e)=>setInventoryForm({...inventoryForm,unit:e.target.value})}/></label><label>Остаток<input type="number" min="0" step="0.01" value={inventoryForm.quantity} onChange={(e)=>setInventoryForm({...inventoryForm,quantity:e.target.value})}/></label></div><div className="crmFormRow"><label>Мин. остаток<input type="number" min="0" step="0.01" value={inventoryForm.min_quantity} onChange={(e)=>setInventoryForm({...inventoryForm,min_quantity:e.target.value})}/></label><label>Цена<input type="number" min="0" value={inventoryForm.price} onChange={(e)=>setInventoryForm({...inventoryForm,price:e.target.value})}/></label></div><button className="crmCreateButton" type="submit"><Save size={17}/>Сохранить</button></form></div></section>}

          {activePage === "warehouse" && <section className="crmDataSection crmV22Warehouse"><div className="crmV4Grid"><form className="crmPanel crmV4Form" onSubmit={addReceipt}><div className="crmPanelHeader"><div><h2>Приход материала</h2><p>Поставка увеличивает фактический остаток</p></div><PackagePlus size={20}/></div><label>Материал<select required value={receiptForm.inventory_item_id} onChange={e=>setReceiptForm({...receiptForm,inventory_item_id:e.target.value})}><option value="">Выберите</option>{adminData.inventory.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}</select></label><label>Поставщик<select value={receiptForm.supplier_id} onChange={e=>setReceiptForm({...receiptForm,supplier_id:e.target.value})}><option value="">Без поставщика</option>{(adminData.suppliers||[]).map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><div className="crmFormRow"><label>Количество<input required type="number" min="0.01" step="0.01" value={receiptForm.quantity} onChange={e=>setReceiptForm({...receiptForm,quantity:e.target.value})}/></label><label>Закупочная цена<input required type="number" min="0" step="0.01" value={receiptForm.unit_price} onChange={e=>setReceiptForm({...receiptForm,unit_price:e.target.value})}/></label></div><input placeholder="Комментарий / накладная" value={receiptForm.note} onChange={e=>setReceiptForm({...receiptForm,note:e.target.value})}/><button className="crmCreateButton">Оприходовать</button></form><form className="crmPanel crmV4Form" onSubmit={createSupplier}><div className="crmPanelHeader"><div><h2>Поставщики</h2><p>{(adminData.suppliers||[]).length} поставщиков</p></div><Truck size={20}/></div><input required placeholder="Название" value={supplierForm.name} onChange={e=>setSupplierForm({...supplierForm,name:e.target.value})}/><div className="crmFormRow"><input placeholder="Телефон" value={supplierForm.phone} onChange={e=>setSupplierForm({...supplierForm,phone:e.target.value})}/><input placeholder="Email" value={supplierForm.email} onChange={e=>setSupplierForm({...supplierForm,email:e.target.value})}/></div><input placeholder="Комментарий" value={supplierForm.note} onChange={e=>setSupplierForm({...supplierForm,note:e.target.value})}/><button className="crmCreateButton">Добавить поставщика</button><div className="crmV22SupplierList">{(adminData.suppliers||[]).map(x=><span key={x.id}><strong>{x.name}</strong><small>{x.phone||x.email||"Контакты не указаны"}</small></span>)}</div></form></div><div className="crmPanel"><div className="crmPanelHeader"><div><h2>Нужно заказать</h2><p>Доступный остаток = склад минус резерв заказов</p></div><AlertTriangle size={20}/></div><div className="crmV22History">{purchaseList.length?purchaseList.map(i=><div key={i.id}><span><strong>{i.name}</strong><small>На складе {i.quantity} {i.unit} · резерв {i.reserved} · доступно {i.available}</small></span><b>мин. {i.min_quantity}</b></div>):<div className="crmEmptyState">Все остатки выше минимума</div>}</div></div><div className="crmPanel"><div className="crmPanelHeader"><div><h2>Последние приходы</h2><p>История движения склада</p></div></div><div className="crmV22History">{(adminData.receipts||[]).slice(0,30).map(r=><div key={r.id}><span><strong>{r.inventory_item?.name||"Материал"}</strong><small>{formatDate(r.created_at)} · {r.supplier?.name||"без поставщика"}</small></span><b>+{r.quantity} · {formatPrice(r.unit_price)}</b></div>)}</div></div></section>}
          {activePage === "settings" && employee?.role === "admin" && <section className="crmDataSection"><div className="crmPanel crmLaunchPanel"><div className="crmPanelHeader"><div><h2>Готовность к запуску</h2><p>Чек-лист перед передачей GarageFlow новой компании</p></div><strong className="crmLaunchScore">{launchReadyCount}/{launchChecklist.length}</strong></div><div className="crmLaunchChecklist">{launchChecklist.map((item)=><div key={item.key} className={item.done?"crmLaunchItem crmLaunchItemDone":"crmLaunchItem"}><span>{item.done?"✓":"○"}</span><strong>{item.label}</strong></div>)}</div><p className="crmHint">Для новой компании создавайте отдельные Supabase, Telegram-бот и Vercel-проект. Эта мастер-версия не требует изменения бизнес-логики под каждого клиента.</p></div><div className="crmV4Grid"><div className="crmPanel"><div className="crmPanelHeader"><div><h2>Услуги и цены</h2><p>Изменения применяются к новым заказам</p></div><Wrench size={20}/></div>{employee?.role === "admin" ? <><div className="crmServiceEditorList">{adminData.services.map((svc)=>{const draft=getServiceDraft(svc);return <div className={`crmServiceEditor ${draft.is_active?"":"crmServiceEditorDisabled"}`} key={svc.id}><div className="crmServiceEditorFields"><label>Название<input value={draft.name} onChange={(e)=>updateServiceDraft(svc,"name",e.target.value)}/></label><label>Цена, ₽<input type="number" min="0" step="1" value={draft.base_price} onChange={(e)=>updateServiceDraft(svc,"base_price",e.target.value)}/></label><label className="crmServiceDescription">Описание<input value={draft.description} onChange={(e)=>updateServiceDraft(svc,"description",e.target.value)}/></label></div><div className="crmServiceEditorActions"><label className="crmServiceToggle"><input type="checkbox" checked={draft.is_active} onChange={(e)=>updateServiceDraft(svc,"is_active",e.target.checked)}/><span>{draft.is_active?"Активна":"Отключена"}</span></label><button className="crmCreateButton" type="button" disabled={savingServiceId===svc.id} onClick={()=>saveService(svc)}><Save size={16}/>{savingServiceId===svc.id?"Сохраняем...":"Сохранить"}</button></div></div>})}</div><form className="crmNewServiceForm" onSubmit={createService}><div><h3>Добавить услугу</h3><p>Новая услуга сразу появится в каталоге и при создании заказа</p></div><div className="crmFormRow"><label>Название<input required value={newService.name} onChange={(e)=>setNewService({...newService,name:e.target.value})}/></label><label>Цена, ₽<input required type="number" min="0" step="1" value={newService.base_price} onChange={(e)=>setNewService({...newService,base_price:e.target.value})}/></label></div><label>Описание<input value={newService.description} onChange={(e)=>setNewService({...newService,description:e.target.value})}/></label><button className="crmCreateButton" type="submit" disabled={savingServiceId==="new"}><Plus size={16}/>{savingServiceId==="new"?"Добавляем...":"Добавить услугу"}</button></form></> : <p className="crmHint">Изменять услуги и цены может только администратор.</p>}</div><div className="crmPanel"><div className="crmPanelHeader"><div><h2>Telegram-уведомления</h2><p>Что отправлять клиенту при изменении заказа</p></div><AtSign size={20}/></div><div className="crmNotifySettings"><label><input type="checkbox" checked={notificationSettings.status_enabled!==false} onChange={(e)=>setNotificationSettings({...notificationSettings,status_enabled:e.target.checked})}/><span><strong>Изменение статуса</strong><small>Согласование, производство, установка, готово и отмена</small></span></label><label><input type="checkbox" checked={notificationSettings.price_enabled!==false} onChange={(e)=>setNotificationSettings({...notificationSettings,price_enabled:e.target.checked})}/><span><strong>Изменение стоимости</strong><small>Сообщить клиенту новую итоговую цену</small></span></label><label><input type="checkbox" checked={notificationSettings.schedule_enabled!==false} onChange={(e)=>setNotificationSettings({...notificationSettings,schedule_enabled:e.target.checked})}/><span><strong>Дата записи</strong><small>Сообщить о новой дате и времени</small></span></label></div><button className="crmCreateButton" type="button" disabled={savingNotificationSettings} onClick={saveNotificationSettings}><Save size={16}/>{savingNotificationSettings?"Сохраняем...":"Сохранить уведомления"}</button></div><div className="crmPanel crmCompanySettings"><div className="crmPanelHeader"><div><h2>Реквизиты и документы</h2><p>Используются в КП и заказ-нарядах</p></div><FileText size={20}/></div>{employee?.role === "admin" ? <><label>Название компании<input value={companySettings.company_name||""} onChange={(e)=>setCompanySettings({...companySettings,company_name:e.target.value})}/></label><label>Юридическое название<input value={companySettings.legal_name||""} onChange={(e)=>setCompanySettings({...companySettings,legal_name:e.target.value})}/></label><div className="crmFormRow"><label>ИНН<input value={companySettings.inn||""} onChange={(e)=>setCompanySettings({...companySettings,inn:e.target.value})}/></label><label>КПП<input value={companySettings.kpp||""} onChange={(e)=>setCompanySettings({...companySettings,kpp:e.target.value})}/></label></div><label>Адрес<input value={companySettings.address||""} onChange={(e)=>setCompanySettings({...companySettings,address:e.target.value})}/></label><div className="crmFormRow"><label>Телефон<input value={companySettings.phone||""} onChange={(e)=>setCompanySettings({...companySettings,phone:e.target.value})}/></label><label>Email<input value={companySettings.email||""} onChange={(e)=>setCompanySettings({...companySettings,email:e.target.value})}/></label></div><label>Банковские реквизиты<textarea rows="3" value={companySettings.bank_details||""} onChange={(e)=>setCompanySettings({...companySettings,bank_details:e.target.value})}/></label><label>Текст внизу документа<textarea rows="2" value={companySettings.document_footer||""} onChange={(e)=>setCompanySettings({...companySettings,document_footer:e.target.value})}/></label><button className="crmCreateButton" type="button" disabled={savingCompanySettings} onClick={saveCompanySettings}><Save size={16}/>{savingCompanySettings?"Сохраняем...":"Сохранить реквизиты"}</button></> : <p className="crmHint">Изменять реквизиты может только администратор.</p>}</div><div className="crmPanel"><div className="crmPanelHeader"><div><h2>Сотрудники</h2><p>Доступ к CRM</p></div><Users size={20}/></div><div className="crmSettingsList">{adminData.employees.map((emp)=><div className="crmSettingsRow crmEmployeeAdminRow" key={emp.id}><div><strong>{emp.display_name||"Сотрудник"}</strong><span>{roleLabels[emp.role]||emp.role}</span></div>{employee?.role==="admin"?<><select className="crmEmployeeRole" value={emp.role||"master"} disabled={savingEmployeeId===emp.id} onChange={(e)=>saveEmployeeProfile(emp,{role:e.target.value})}><option value="admin">Администратор</option><option value="manager">Менеджер</option><option value="master">Мастер</option></select><label className="crmEmployeeActive"><input type="checkbox" checked={emp.is_active!==false} disabled={savingEmployeeId===emp.id||emp.id===employee?.id} onChange={(e)=>saveEmployeeProfile(emp,{is_active:e.target.checked})}/><span>{emp.is_active?"Активен":"Отключён"}</span></label><button type="button" className="crmEmployeeTelegram" onClick={()=>saveEmployeeTelegram(emp)}>{emp.telegram_chat_id?"Telegram ✓":"+ Telegram"}</button></>:<span className={emp.is_active?"crmActiveDot":"crmInactiveDot"}>{emp.is_active?"Активен":"Отключён"}</span>}</div>)}</div><p className="crmHint">Роли: администратор — полный доступ; менеджер — продажи, клиенты, документы и аналитика; мастер — только назначенные заказы, производство, материалы, задачи и календарь. Права на критические действия проверяются сервером.</p></div></div></section>}

          {activePage === "analytics" && <>
            <section className="crmStats crmStatsFive">
              <button type="button" className="crmStat crmV21StatButton" onClick={()=>setActivePage("finance")}><span>Выручка</span><strong>{formatPrice(totalRevenue)}</strong></button>
              <div className="crmStat"><span>Оплачено</span><strong>{formatPrice(businessEconomics.paid)}</strong></div>
              <div className="crmStat"><span>Долг клиентов</span><strong>{formatPrice(businessEconomics.debt)}</strong></div>
              <div className="crmStat"><span>Материалы</span><strong>{formatPrice(businessEconomics.materialCost)}</strong></div>
              <div className="crmStat"><span>Труд</span><strong>{formatPrice(businessEconomics.laborCost)}</strong></div>
              <div className="crmStat"><span>Прибыль</span><strong>{formatPrice(businessEconomics.profit)}</strong></div>
              <div className="crmStat"><span>Маржа</span><strong>{businessMargin.toFixed(1)}%</strong></div>
            </section>
            <section className="crmAnalyticsGrid">
              <div className="crmPanel"><div className="crmPanelHeader"><div><h2>Экономика по месяцам</h2><p>Выручка и валовая прибыль за последние 6 месяцев</p></div><TrendingUp size={20}/></div><div className="crmRevenueChart">{monthlyStats.map((m)=><div className="crmRevenueColumn" key={m.key}><div className="crmRevenueValue">{m.revenue ? formatPrice(m.revenue) : "0 ₽"}</div><div className="crmRevenueBarWrap"><div className="crmRevenueBar" style={{height:`${Math.max(m.revenue ? 10 : 2,(m.revenue/maxMonthlyRevenue)*100)}%`}}/></div><strong>{m.label}</strong><span>{m.orders} заказ. · прибыль {formatPrice(m.profit)}</span></div>)}</div></div>
              <div className="crmPanel"><div className="crmPanelHeader"><div><h2>Популярные услуги</h2><p>По количеству в заказах</p></div><Wrench size={20}/></div><div className="crmServiceStats">{serviceStats.length ? serviceStats.map((item,index)=><div className="crmServiceStat" key={item.name}><div className="crmServiceRank">{index+1}</div><div><strong>{item.name}</strong><span>{item.count} шт. · {formatPrice(item.revenue)}</span></div></div>) : <div className="crmEmptyState">Пока недостаточно данных</div>}</div></div>
            </section>
            <section className="crmAnalyticsGrid">
              <div className="crmPanel"><div className="crmPanelHeader"><div><h2>Статусы заказов</h2><p>Текущая загрузка</p></div><BarChart3 size={20}/></div><div className="crmFunnel">{funnel.map((item)=><div className="crmFunnelItem" key={item.key}><div className="crmFunnelTop"><span>{item.label}</span><strong>{item.count}</strong></div><div className="crmFunnelTrack"><div className="crmFunnelFill" style={{width:`${Math.max(item.count?12:0,(item.count/maxFunnel)*100)}%`}}/></div></div>)}</div></div>
              <div className="crmPanel"><div className="crmPanelHeader"><div><h2>Контроль работы</h2><p>Что требует внимания</p></div><AlertTriangle size={20}/></div><div className="crmControlStats"><div><span>Срочные заказы</span><strong>{urgentOrders.length}</strong></div><div><span>Высокий приоритет</span><strong>{highPriorityOrders.length}</strong></div><div><span>Просроченные записи</span><strong>{overdueOrders.length}</strong></div><div><span>Отменённые</span><strong>{cancelledOrders.length}</strong></div></div></div>
            </section>
            <section className="crmStats"><div className="crmStat"><span>Всего лидов</span><strong>{orders.length}</strong></div><div className="crmStat"><span>Выполнено</span><strong>{doneOrders}</strong></div><div className="crmStat"><span>Отказов</span><strong>{cancelledOrders.length}</strong></div><div className="crmStat"><span>Конверсия в выполненные</span><strong>{overallConversion}%</strong></div></section>
            <section className="crmAnalyticsGrid">
              <div className="crmPanel"><div className="crmPanelHeader"><div><h2>Источники заявок</h2><p>Количество, выполненные заказы и выручка</p></div><Users size={20}/></div><div className="crmServiceStats">{sourceStats.length?sourceStats.map((x)=><div className="crmServiceStat" key={x.key}><div className="crmServiceRank">{x.count}</div><div><strong>{leadSourceLabels[x.key]||x.key}</strong><span>{x.done} выполнено · {formatPrice(x.revenue)}</span></div></div>):<div className="crmEmptyState">Пока недостаточно данных</div>}</div></div>
              <div className="crmPanel"><div className="crmPanelHeader"><div><h2>Причины отказов</h2><p>Почему заявки не дошли до выполнения</p></div><X size={20}/></div><div className="crmServiceStats">{cancellationStats.length?cancellationStats.map(([key,count])=><div className="crmServiceStat" key={key}><div className="crmServiceRank">{count}</div><div><strong>{cancellationReasonLabels[key]||key}</strong><span>отменённых заказов</span></div></div>):<div className="crmEmptyState">Отказов с указанной причиной пока нет</div>}</div></div>
            </section>
          </>}
        </>}
      </main>

      {showCreateOrder && <div className="crmModalBackdrop" onClick={()=>setShowCreateOrder(false)}><form className="crmModal crmCreateOrderModal" onSubmit={createManualOrder} onClick={(e)=>e.stopPropagation()}><button className="crmModalClose" type="button" onClick={()=>setShowCreateOrder(false)}><X size={21}/></button><div className="crmOrderNumber">НОВЫЙ ЗАКАЗ</div><h2>Создать заказ вручную</h2><p className="crmModalCustomer">Для звонков, WhatsApp и заявок вне Telegram</p><div className="crmModalSection"><span className="crmModalLabel">Клиент</span><div className="crmFormRow"><label>Имя<input required value={newOrder.first_name} onChange={(e)=>setNewOrder({...newOrder,first_name:e.target.value})}/></label><label>Фамилия<input value={newOrder.last_name} onChange={(e)=>setNewOrder({...newOrder,last_name:e.target.value})}/></label></div><div className="crmFormRow"><label>Телефон<input value={newOrder.phone} onChange={(e)=>setNewOrder({...newOrder,phone:e.target.value})}/></label><label>Telegram<input value={newOrder.username} onChange={(e)=>setNewOrder({...newOrder,username:e.target.value})}/></label></div></div><div className="crmModalSection"><span className="crmModalLabel">Автомобиль</span><div className="crmFormRow"><label>Марка<input required value={newOrder.brand} onChange={(e)=>setNewOrder({...newOrder,brand:e.target.value})}/></label><label>Модель<input required value={newOrder.model} onChange={(e)=>setNewOrder({...newOrder,model:e.target.value})}/></label></div><div className="crmFormRow"><label>Год<input type="number" value={newOrder.year} onChange={(e)=>setNewOrder({...newOrder,year:e.target.value})}/></label><label>Конфигурация<input value={newOrder.configuration} onChange={(e)=>setNewOrder({...newOrder,configuration:e.target.value})}/></label></div><div className="crmFormRow"><label>Госномер<input value={newOrder.license_plate} onChange={(e)=>setNewOrder({...newOrder,license_plate:e.target.value})}/></label><label>VIN<input value={newOrder.vin} onChange={(e)=>setNewOrder({...newOrder,vin:e.target.value})}/></label></div></div><div className="crmModalSection"><span className="crmModalLabel">Услуги</span><div className="crmServicePicker">{adminData.services.filter((x)=>x.is_active).map((svc)=><label key={svc.id}><input type="checkbox" checked={newOrder.service_ids.includes(svc.id)} onChange={(e)=>setNewOrder({...newOrder,service_ids:e.target.checked?[...newOrder.service_ids,svc.id]:newOrder.service_ids.filter((id)=>id!==svc.id)})}/><span><strong>{svc.name}</strong><small>{formatPrice(svc.base_price)}</small></span></label>)}</div></div><div className="crmModalSection"><span className="crmModalLabel">Запись и приоритет</span><div className="crmFormRow"><label>Дата и время<input type="datetime-local" value={newOrder.scheduled_at} onChange={(e)=>setNewOrder({...newOrder,scheduled_at:e.target.value})}/></label><label>Приоритет<select value={newOrder.priority} onChange={(e)=>setNewOrder({...newOrder,priority:e.target.value})}><option value="normal">Обычный</option><option value="high">Высокий</option><option value="urgent">Срочный</option></select></label></div><label>Источник заявки<select value={newOrder.lead_source} onChange={(e)=>setNewOrder({...newOrder,lead_source:e.target.value})}><option value="phone">Телефон</option><option value="website">Сайт</option><option value="recommendation">Рекомендация</option><option value="whatsapp">WhatsApp</option><option value="manual">Вручную</option><option value="other">Другое</option></select></label><label>Комментарий<textarea rows="3" value={newOrder.comment} onChange={(e)=>setNewOrder({...newOrder,comment:e.target.value})}/></label></div><button className="crmCreateButton crmCreateWide" type="submit" disabled={savingOrder}>{savingOrder?"Создаём...":"Создать заказ"}</button></form></div>}

      {selectedCustomer && <div className="crmModalBackdrop" onClick={()=>setSelectedCustomer(null)}><div className="crmModal crmEntityModal" onClick={(e)=>e.stopPropagation()}><button className="crmModalClose" type="button" onClick={()=>setSelectedCustomer(null)}><X size={21}/></button><div className="crmOrderNumber">КАРТОЧКА КЛИЕНТА</div><h2>{getCustomerName(selectedCustomer)}</h2><p className="crmModalCustomer">{selectedCustomer.ordersCount} заказ(а) · {formatPrice(selectedCustomer.total)}</p><button className="crmInlineEdit" type="button" onClick={()=>editCustomerQuick(selectedCustomer)}><Pencil size={16}/>Редактировать клиента</button><div className="crmEntityFacts">{selectedCustomer.phone&&<div><Phone size={17}/><span>Телефон</span><strong>{selectedCustomer.phone}</strong></div>}{selectedCustomer.username&&<div><AtSign size={17}/><span>Telegram</span><strong>@{selectedCustomer.username}</strong></div>}</div><div className="crmModalSection"><span className="crmModalLabel">Автомобили</span><div className="crmModalItems">{vehicles.filter((v)=>v.customer?.id===selectedCustomer.id).map((v)=><button className="crmEntityRow" key={v.id} onClick={()=>{setSelectedCustomer(null);setSelectedVehicle(v);}}><Car size={17}/><div><strong>{getVehicleName(v)}</strong><span>{v.license_plate||"Госномер не указан"}</span></div><ChevronRight size={17}/></button>)}</div></div><div className="crmModalSection"><span className="crmModalLabel">История заказов</span><div className="crmModalItems">{[...(selectedCustomer.orders||[])].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).map((o)=><button className="crmEntityRow" key={o.id} onClick={()=>{setSelectedCustomer(null);goToOrder(o);}}><ClipboardList size={17}/><div><strong>Заказ №{o.id} · {getVehicleName(o.vehicle)}</strong><span>{statusLabels[o.status]||o.status} · {formatPrice(orderAmount(o))}</span></div><ChevronRight size={17}/></button>)}</div></div></div></div>}

      {selectedVehicle && <div className="crmModalBackdrop" onClick={()=>setSelectedVehicle(null)}><div className="crmModal crmEntityModal" onClick={(e)=>e.stopPropagation()}><button className="crmModalClose" type="button" onClick={()=>setSelectedVehicle(null)}><X size={21}/></button><div className="crmOrderNumber">КАРТОЧКА АВТОМОБИЛЯ</div><h2>{getVehicleName(selectedVehicle)}</h2><p className="crmModalCustomer">{getCustomerName(selectedVehicle.customer)} · {selectedVehicle.ordersCount} заказ(а)</p><button className="crmInlineEdit" type="button" onClick={()=>editVehicleQuick(selectedVehicle)}><Pencil size={16}/>Редактировать автомобиль</button><div className="crmEntityFacts"><div><Car size={17}/><span>Год</span><strong>{selectedVehicle.year||"Не указан"}</strong></div>{selectedVehicle.license_plate&&<div><Hash size={17}/><span>Госномер</span><strong>{selectedVehicle.license_plate}</strong></div>}{selectedVehicle.vin&&<div><Hash size={17}/><span>VIN</span><strong>{selectedVehicle.vin}</strong></div>}<div><CircleDollarSign size={17}/><span>Сумма работ</span><strong>{formatPrice(selectedVehicle.total)}</strong></div></div><div className="crmModalSection"><span className="crmModalLabel">История работ</span><div className="crmModalItems">{[...(selectedVehicle.orders||[])].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).map((o)=><button className="crmEntityRow" key={o.id} onClick={()=>{setSelectedVehicle(null);goToOrder(o);}}><Wrench size={17}/><div><strong>Заказ №{o.id}</strong><span>{o.items?.map((i)=>i.service_name).join(" • ")||"Работы не указаны"}</span><span>{statusLabels[o.status]||o.status} · {formatPrice(orderAmount(o))}</span></div><ChevronRight size={17}/></button>)}</div></div></div></div>}

      {selectedOrder && <div className="crmModalBackdrop" onClick={()=>setSelectedOrder(null)}><div className="crmModal" onClick={(e)=>e.stopPropagation()}>
        <button className="crmModalClose" type="button" onClick={()=>setSelectedOrder(null)}><X size={21}/></button>
        <div className="crmOrderNumber">ЗАКАЗ №{selectedOrder.id}</div><h2>{getVehicleName(selectedOrder.vehicle)}</h2><p className="crmModalCustomer">{getCustomerName(selectedOrder.customer)}{selectedOrder.customer?.phone && ` · ${selectedOrder.customer.phone}`}</p>
        <div className="crmModalSection"><span className="crmModalLabel">Текущий статус</span><strong>{statusLabels[selectedOrder.status] || selectedOrder.status}</strong></div>
        {employee?.role !== "master" && <div className="crmModalSection crmOperationalSection"><span className="crmModalLabel">Работа с заявкой</span><div className="crmOperationalRow"><div><span>Просмотр</span><strong>{selectedOrder.viewed_at?formatDate(selectedOrder.viewed_at):"Новая заявка"}</strong></div><div><span>Принята в работу</span><strong>{selectedOrder.accepted_at?formatDate(selectedOrder.accepted_at):"Ещё нет"}</strong></div>{!selectedOrder.accepted_at&&<button type="button" className="crmCreateButton" onClick={acceptOrder}>Принять в работу</button>}</div></div>}
        {employee?.role !== "master" && <div className="crmModalSection"><span className="crmModalLabel">Воронка продаж</span><div className="crmFormRow"><label>Источник заявки<select value={editingOrder.lead_source} onChange={(e)=>setEditingOrder((c)=>({...c,lead_source:e.target.value}))}>{Object.entries(leadSourceLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><label>Причина отказа<select value={editingOrder.cancellation_reason} onChange={(e)=>setEditingOrder((c)=>({...c,cancellation_reason:e.target.value}))}><option value="">Не указана</option>{Object.entries(cancellationReasonLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label></div>{selectedOrder.status!=="cancelled"&&<small className="crmDocumentsHint">Причина отказа обязательна только при отмене заказа.</small>}</div>}
        {employee?.role !== "master" && <div className="crmModalSection"><span className="crmModalLabel">Изменить статус</span><div className="crmStatusButtons">{columns.map((column)=><button key={column.key} type="button" disabled={changingStatus||savingOrder} className={selectedOrder.status===column.key?"crmStatusButton crmStatusButtonActive":"crmStatusButton"} onClick={()=>changeStatus(selectedOrder,column.key)}>{selectedOrder.status===column.key&&<CheckCircle2 size={15}/>} {column.label}</button>)}</div></div>}
        <div className="crmModalSection"><span className="crmModalLabel">Работы</span><div className="crmModalItems">{selectedOrder.items?.map((item)=><div key={item.id} className="crmModalItem"><div><strong>{item.service_name}</strong>{item.material&&<span>{item.material}</span>}</div>{employee?.role !== "master" && <strong>{formatPrice(item.price)}</strong>}</div>)}</div></div>
        {selectedOrder.customer_comment&&<div className="crmModalSection"><span className="crmModalLabel">Комментарий клиента</span><p>{selectedOrder.customer_comment}</p></div>}
        {employee?.role !== "master" && <div className="crmModalSection"><span className="crmModalLabel">Приоритет заказа</span><div className="crmPriorityChoices">{[["normal","Обычный"],["high","Высокий"],["urgent","Срочный"]].map(([key,label])=><button type="button" key={key} className={`crmPriorityChoice crmPriorityChoice-${key} ${editingOrder.priority===key?"crmPriorityChoiceActive":""}`} onClick={()=>setEditingOrder((c)=>({...c,priority:key}))}>{label}</button>)}</div></div>}
        {employee?.role !== "master" && <div className="crmModalSection crmV181Booking"><span className="crmModalLabel">Запись клиента</span>{selectedOrder.requested_at ? <div className={`crmV181Request ${selectedOrder.booking_status==="reschedule_requested"?"crmV181RequestMove":""}`}><div><small>{selectedOrder.booking_status==="reschedule_requested"?"Клиент просит перенести на":"Желаемое время клиента"}</small><strong>{formatDate(selectedOrder.requested_at)}</strong><span>{selectedOrder.booking_status==="reschedule_requested"?"Запрос на перенос":"Запрос клиента"}</span></div><button type="button" disabled={savingOrder} onClick={confirmRequestedBooking}>{savingOrder?"Сохраняем...":"Принять это время"}</button></div> : <div className="crmV181NoRequest">Клиент не указывал желаемое время.</div>}<div className="crmV181Scheduled"><label><span>Подтверждённая запись</span><input className="crmEditInput" type="datetime-local" value={editingOrder.scheduled_at} onChange={(e)=>setEditingOrder((c)=>({...c,scheduled_at:e.target.value}))}/></label><button type="button" className="crmV183ProposeBooking" disabled={savingOrder||!editingOrder.scheduled_at} onClick={proposeBookingTime}>{savingOrder?"Сохраняем...":"Предложить это время"}</button><div className={`crmV181BookingState crmV181BookingState-${selectedOrder.booking_status||"none"}`}>{selectedOrder.booking_status==="confirmed"?"✓ Запись подтверждена":selectedOrder.booking_status==="scheduled"?"Ожидаем подтверждения клиента":selectedOrder.booking_status==="reschedule_requested"?"Клиент запросил перенос":selectedOrder.booking_status==="requested"?"Нужно назначить время":selectedOrder.booking_status==="cancelled"?"Запись отменена":"Запись не подтверждена"}</div></div><div className="crmV192OrderSlot"><label><span>Рабочий пост</span><select value={selectedOrder.service_bay||""} onChange={(e)=>assignServiceBay(selectedOrder,e.target.value)}><option value="">Авто</option>{Array.from({length:SERVICE_BAYS_COUNT},(_,i)=><option key={i+1} value={i+1}>Пост {i+1}</option>)}</select></label><label><span>Длительность</span><select value={Number(selectedOrder.service_duration_minutes||120)} onChange={(e)=>setServiceDuration(selectedOrder,e.target.value)}>{[30,60,90,120,180,240,360,480].map((m)=><option value={m} key={m}>{m<60?`${m} мин`:`${m/60} ч`}</option>)}</select></label></div><small className="crmDocumentsHint">Если принять время клиента — запись подтверждается сразу. Если назначить другое время — клиенту потребуется его подтвердить. Пост и длительность используются для расчёта загрузки сервиса.</small>{selectedOrder.scheduled_at&&<div className="crmV182BookingActions"><button type="button" className="crmV182CancelBooking" onClick={cancelBooking} disabled={savingOrder}>Отменить только запись</button></div>}</div>}
        {employee?.role !== "master" && <div className="crmModalSection"><span className="crmModalLabel">Итоговая стоимость</span><div className="crmPriceInputWrap"><input className="crmEditInput" type="number" min="0" step="1" value={editingOrder.final_price} onChange={(e)=>setEditingOrder((c)=>({...c,final_price:e.target.value}))} placeholder="Например, 52000"/><span>₽</span></div></div>}
        {employee?.role !== "master" && <div className="crmModalSection"><span className="crmModalLabel">Комментарий менеджера</span><textarea className="crmEditTextarea" value={editingOrder.manager_comment} onChange={(e)=>setEditingOrder((c)=>({...c,manager_comment:e.target.value}))} placeholder="Например: клиент согласовал дополнительную защиту арок" rows={4}/></div>}
        <div className="crmModalSection crmProductionSection">
          <span className="crmModalLabel">Производство</span>
          {productionLoading ? <div className="crmEmptyState">Загружаем производство...</div> : <>
            {employee?.role !== "master" ? <label className="crmProductionAssignee">Ответственный
              <select value={productionData.assigned_employee_id || ""} onChange={(e)=>assignEmployee(e.target.value)}>
                <option value="">Не назначен</option>
                {adminData.employees.filter((x)=>x.is_active).map((emp)=><option key={emp.id} value={emp.id}>{emp.display_name || `Сотрудник #${emp.id}`}</option>)}
              </select>
            </label> : <div className="crmMasterNotice">Рабочий режим мастера: этапы производства, материалы и задачи.</div>}
            <div className="crmV16Progress"><div><strong>Прогресс производства</strong><span>{productionData.tasks.length ? Math.round(productionData.tasks.filter((t)=>(t.status|| (t.is_done?"done":"todo"))==="done").length/productionData.tasks.length*100) : 0}%</span></div><div className="crmV16ProgressTrack"><i style={{width:`${productionData.tasks.length ? Math.round(productionData.tasks.filter((t)=>(t.status||(t.is_done?"done":"todo"))==="done").length/productionData.tasks.length*100) : 0}%`}}/></div></div>
            <div className="crmProductionTasks crmV16Stages">
              {productionData.tasks.map((task)=>{const taskStatus=task.status||(task.is_done?"done":"todo");return <div key={task.id} className={`crmV16Stage crmV16Stage-${taskStatus}`}><div className="crmV16StageHead"><div><strong>{task.title}</strong><small>{task.assignee?.display_name||"Без исполнителя"}{task.due_at?` · до ${formatDate(task.due_at)}`:""}</small></div><span>{taskStatus==="done"?"Готово":taskStatus==="in_progress"?"В работе":"Не начат"}</span></div>{task.notes&&<p>{task.notes}</p>}{employee?.role !== "manager"&&<div className="crmV16StageActions"><button type="button" className={taskStatus==="todo"?"active":""} onClick={()=>setProductionTaskStatus(task,"todo")}>Не начат</button><button type="button" className={taskStatus==="in_progress"?"active":""} onClick={()=>setProductionTaskStatus(task,"in_progress")}>В работу</button><button type="button" className={taskStatus==="done"?"active":""} onClick={()=>setProductionTaskStatus(task,"done")}>Готово</button></div>}</div>})}
              {!productionData.tasks.length && <div className="crmEmptyState">Этапов производства пока нет</div>}
            </div>
            {employee?.role !== "manager" && <form className="crmProductionAdd crmV16AddStage crmV161StageForm" onSubmit={addProductionTask}>
              <label className="crmV161StageField crmV161StageTitle"><span>Название этапа</span><input value={newTaskTitle} onChange={(e)=>setNewTaskTitle(e.target.value)} placeholder="Например: раскрой фанеры"/></label>
              <label className="crmV161StageField"><span>Исполнитель</span><select value={productionTaskDraft.assigned_employee_id} onChange={(e)=>setProductionTaskDraft((c)=>({...c,assigned_employee_id:e.target.value}))}><option value="">Исполнитель заказа</option>{adminData.employees.filter((x)=>x.is_active&&x.role==="master").map((emp)=><option key={emp.id} value={emp.id}>{emp.display_name}</option>)}</select></label>
              <label className="crmV161StageField"><span>Срок этапа</span><input type="datetime-local" value={productionTaskDraft.due_at} onChange={(e)=>setProductionTaskDraft((c)=>({...c,due_at:e.target.value}))}/></label>
              <button className="crmV161AddStageButton" type="submit">Добавить этап</button>
            </form>}
            <div className="crmV16Photos"><div className="crmV16PhotoHeader"><div><strong>Фото работ</strong><small>До / процесс / после</small></div>{employee?.role!=="manager"&&<div className="crmV16PhotoButtons"><label>+ До<input type="file" accept="image/*" onChange={(e)=>uploadProductionPhoto(e,"before")}/></label><label>+ Процесс<input type="file" accept="image/*" onChange={(e)=>uploadProductionPhoto(e,"process")}/></label><label>+ После<input type="file" accept="image/*" onChange={(e)=>uploadProductionPhoto(e,"after")}/></label></div>}</div>{uploadingProductionPhoto&&<div className="crmEmptyState">Загружаем фото...</div>}<div className="crmV16PhotoGrid">{(productionData.photos||[]).map((photo)=><a key={photo.id} href={photo.url} target="_blank" rel="noreferrer"><img src={photo.url} alt={photo.kind}/><span>{photo.kind==="before"?"До":photo.kind==="after"?"После":"Процесс"}</span></a>)}</div>{!(productionData.photos||[]).length&&!uploadingProductionPhoto&&<div className="crmEmptyState">Фото работ пока нет</div>}</div>
            {employee?.role === "manager" && <div className="crmMasterNotice">Производство доступно менеджеру только для просмотра. Исполнение ведёт назначенный мастер.</div>}
          </>}
        </div>
        <div className="crmModalSection crmProductionSection">
          <span className="crmModalLabel">Материалы заказа</span>
          <div className="crmOrderMaterials">
            {productionData.materials.map((item)=><div className="crmOrderMaterial" key={item.id}><div><strong>{item.inventory_item?.name || "Материал"}</strong><span>{formatDate(item.created_at)}</span></div><strong>{item.quantity} {item.inventory_item?.unit || ""}<small>{item.unit_price != null ? ` · ${formatPrice(Number(item.quantity||0)*Number(item.unit_price||0))}` : ""}</small></strong></div>)}
            {!productionData.materials.length && <div className="crmEmptyState">Материалы ещё не списывались</div>}
          </div>
          {employee?.role !== "manager" && <form className="crmMaterialAdd" onSubmit={addOrderMaterial}>
            <select value={materialDraft.inventory_item_id} onChange={(e)=>setMaterialDraft({...materialDraft,inventory_item_id:e.target.value})}><option value="">Выберите материал</option>{adminData.inventory.map((item)=><option key={item.id} value={item.id}>{item.name} · остаток {item.quantity} {item.unit}</option>)}</select>
            <input type="number" min="0.01" step="0.01" value={materialDraft.quantity} onChange={(e)=>setMaterialDraft({...materialDraft,quantity:e.target.value})} placeholder="Количество"/>
            <button type="submit">Списать</button>
          </form>}
        </div>
        {employee?.role !== "master" && <div className="crmModalSection crmV20Finance"><span className="crmModalLabel">Оплаты</span>{(()=>{const e=getOrderEconomics(selectedOrder);const payments=getOrderPayments(selectedOrder);return <><div className="crmV20MoneyGrid"><div><span>Стоимость заказа</span><strong>{formatPrice(e.revenue)}</strong></div><div><span>Оплачено</span><strong>{formatPrice(e.paid)}</strong></div><div className={e.debt>0?"debt":"ok"}><span>Остаток</span><strong>{formatPrice(e.debt)}</strong></div></div><div className="crmV20Payments">{payments.length?payments.map((p)=><div key={p.id}><div><strong>{formatPrice(p.amount)}</strong><span>{({cash:"Наличные",card:"Карта",transfer:"Перевод",invoice:"Счёт"})[p.method]||p.method}{p.note?` · ${p.note}`:""}</span></div><small>{formatDate(p.paid_at||p.created_at)}</small></div>):<div className="crmEmptyState">Платежей пока нет</div>}</div><form className="crmV20PaymentForm" onSubmit={addPayment}><input type="number" min="1" step="1" required placeholder="Сумма, ₽" value={paymentDraft.amount} onChange={(ev)=>setPaymentDraft({...paymentDraft,amount:ev.target.value})}/><select value={paymentDraft.method} onChange={(ev)=>setPaymentDraft({...paymentDraft,method:ev.target.value})}><option value="card">Карта</option><option value="cash">Наличные</option><option value="transfer">Перевод</option><option value="invoice">Счёт</option></select><input placeholder="Комментарий" value={paymentDraft.note} onChange={(ev)=>setPaymentDraft({...paymentDraft,note:ev.target.value})}/><button type="submit" disabled={savingPayment}>{savingPayment?"Сохраняем...":"Добавить оплату"}</button></form></>})()}</div>}
        {employee?.role !== "master" && <div className="crmModalSection crmEconomicsSection">
          <span className="crmModalLabel">Экономика заказа</span>
          {(()=>{ const base=getOrderEconomics(selectedOrder); const materialCost=productionData.materials.reduce((sum,item)=>sum+Number(item.quantity||0)*Number(item.unit_price||0),0); const laborCost=Number(laborCostDraft||0); const cost=materialCost+laborCost; const profit=base.revenue-cost; const margin=base.revenue>0?(profit/base.revenue)*100:0; return <>
            <div className="crmEconomicsGrid">
              <div><span>Выручка</span><strong>{formatPrice(base.revenue)}</strong></div>
              <div><span>Материалы</span><strong>{formatPrice(materialCost)}</strong></div>
              <div><span>Труд</span><strong>{formatPrice(laborCost)}</strong></div>
              <div><span>Начислено мастеру</span><strong>{formatPrice(Number(masterPayDraft||0))}</strong></div>
              <div><span>Себестоимость</span><strong>{formatPrice(cost)}</strong></div>
              <div className={profit<0?"crmEconomicsNegative":"crmEconomicsPositive"}><span>Валовая прибыль</span><strong>{formatPrice(profit)}</strong></div>
              <div><span>Маржа</span><strong>{margin.toFixed(1)}%</strong></div>
            </div>
            {employee?.role === "admin" && <div className="crmLaborCostEditor"><label>Фактическая стоимость труда, ₽<input type="number" min="0" step="1" value={laborCostDraft} onChange={(e)=>setLaborCostDraft(e.target.value)}/></label><label>Начисление мастеру, ₽<input type="number" min="0" step="1" value={masterPayDraft} onChange={(e)=>setMasterPayDraft(e.target.value)}/></label><button type="button" disabled={savingEconomics} onClick={saveOrderEconomics}>{savingEconomics?"Сохраняем...":"Сохранить экономику"}</button></div>}
            {employee?.role === "manager" && <div className="crmMasterNotice">Экономика доступна для просмотра. Фактическую стоимость труда изменяет администратор.</div>}
          </>; })()}
        </div>}
        {saveMessage&&<div className="crmSaveSuccess"><CheckCircle2 size={17}/>{saveMessage}</div>}
        {employee?.role !== "master" && <div className="crmModalTotal"><span>Стоимость</span><strong>{formatPrice(orderAmount(selectedOrder))}</strong></div>}
        <div className="crmModalDate"><Clock3 size={16}/>Создан {formatDate(selectedOrder.created_at)}</div>
        {employee?.role !== "master" && <div className="crmModalSection crmDocumentsSection"><span className="crmModalLabel">Документы</span><p className="crmDocumentsHint">Документ откроется в печатном виде. В окне печати можно выбрать «Сохранить как PDF».</p><div className="crmDocumentActions"><button type="button" onClick={()=>printOrderDocument("quote")}><FileText size={17}/>Коммерческое предложение</button><button type="button" onClick={()=>sendOrderDocumentToTelegram("quote")} disabled={!!sendingDocument}><Send size={17}/>{sendingDocument==="quote"?"Отправляем...":"КП → Telegram"}</button><button type="button" onClick={()=>printOrderDocument("work_order")}><Printer size={17}/>Заказ-наряд / PDF</button><button type="button" onClick={()=>sendOrderDocumentToTelegram("work_order")} disabled={!!sendingDocument}><Send size={17}/>{sendingDocument==="work_order"?"Отправляем...":"Заказ-наряд → Telegram"}</button></div></div>}<div className="crmModalSection crmTasksSection"><span className="crmModalLabel">Внутренние задачи</span><div className="crmTaskList">{orderTasks.length?orderTasks.map((task)=><button type="button" key={task.id} className={`crmTaskRow ${task.is_done?"crmTaskDone":""} ${!task.is_done&&task.due_at&&new Date(task.due_at)<new Date()?"crmTaskOverdue":""}`} onClick={()=>toggleCrmTask(task)}><span>{task.is_done?"✓":"○"}</span><div><strong>{task.title}</strong><small>{task.assignee?.display_name||"Без ответственного"}{task.due_at?` · до ${formatDate(task.due_at)}`:""}</small></div></button>):<div className="crmEmptyState">Задач пока нет</div>}</div><form className="crmTaskForm" onSubmit={addCrmTask}><input required value={taskDraft.title} onChange={(e)=>setTaskDraft({...taskDraft,title:e.target.value})} placeholder="Например: позвонить клиенту"/><input type="datetime-local" value={taskDraft.due_at} onChange={(e)=>setTaskDraft({...taskDraft,due_at:e.target.value})}/>{employee?.role !== "master" ? <select value={taskDraft.assigned_employee_id} onChange={(e)=>setTaskDraft({...taskDraft,assigned_employee_id:e.target.value})}><option value="">Я</option>{adminData.employees.filter((x)=>x.is_active).map((emp)=><option key={emp.id} value={emp.id}>{emp.display_name}</option>)}</select> : <input type="hidden" value="" />}<button type="submit">Добавить</button></form></div><div className="crmModalSection"><span className="crmModalLabel">История заказа</span><div className="crmHistoryList">{orderHistory.length ? orderHistory.map((event)=><div className="crmHistoryItem" key={event.id}><History size={16}/><div><strong>{event.description}</strong><span>{formatDate(event.created_at)}{event.employee?.display_name?` · ${event.employee.display_name}`:""}</span></div></div>) : <div className="crmEmptyState">История появится после изменений в версии v4</div>}</div></div>{employee?.role !== "master" && <div className="crmModalActions"><button type="button" className="crmSaveButton" disabled={savingOrder||changingStatus} onClick={saveOrderChanges}>{savingOrder?"Сохраняем...":"Сохранить изменения"}</button><button type="button" className="crmCancelButton" disabled={savingOrder||changingStatus||selectedOrder.status==="cancelled"} onClick={cancelOrder}>{selectedOrder.status==="cancelled"?"Заказ отменён":"Отменить заказ"}</button></div>}
      </div></div>}
    </div>
  );
}
