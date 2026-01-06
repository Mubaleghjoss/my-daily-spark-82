import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { PremiumDialog } from "@/components/PremiumDialog";
import { 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  PieChart as PieChartIcon,
  Calendar,
  Trash2,
  Edit,
  Target,
  Download,
  MessageCircle,
  Tag,
  Phone,
  RefreshCw,
  Play,
  Pause,
  Crown
} from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay, parseISO, addDays, addWeeks, addMonths, addYears } from "date-fns";
import { id } from "date-fns/locale";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import * as XLSX from "xlsx";

interface TransactionCategory {
  id: string;
  name: string;
  type: "income" | "expense";
  color: string;
  icon?: string;
}

interface Transaction {
  id: string;
  category_id: string | null;
  amount: number;
  type: "income" | "expense";
  description: string | null;
  transaction_date: string;
  category?: TransactionCategory;
}

interface Budget {
  id: string;
  category_id: string;
  amount: number;
  period: "daily" | "weekly" | "monthly";
  category?: TransactionCategory;
}

interface RecurringTransaction {
  id: string;
  category_id: string | null;
  amount: number;
  type: "income" | "expense";
  description: string | null;
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  day_of_month: number | null;
  day_of_week: number | null;
  is_active: boolean;
  next_due_date: string;
  category?: TransactionCategory;
}

type StatPeriod = "daily" | "weekly" | "monthly";

const DEFAULT_CATEGORIES: Omit<TransactionCategory, "id">[] = [
  { name: "Gaji", type: "income", color: "#22c55e" },
  { name: "Bonus", type: "income", color: "#10b981" },
  { name: "Investasi", type: "income", color: "#06b6d4" },
  { name: "Lainnya (Masuk)", type: "income", color: "#3b82f6" },
  { name: "Makan", type: "expense", color: "#f59e0b" },
  { name: "Transport", type: "expense", color: "#ef4444" },
  { name: "Belanja", type: "expense", color: "#ec4899" },
  { name: "Tagihan", type: "expense", color: "#8b5cf6" },
  { name: "Hiburan", type: "expense", color: "#f97316" },
  { name: "Kesehatan", type: "expense", color: "#14b8a6" },
  { name: "Lainnya (Keluar)", type: "expense", color: "#6b7280" },
];

const CHART_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"];

export default function Finance() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isPremium } = useSubscription();
  const [showPremiumDialog, setShowPremiumDialog] = useState(false);
  const [premiumFeatureName, setPremiumFeatureName] = useState("");
  
  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showAddBudget, setShowAddBudget] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showAddRecurring, setShowAddRecurring] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editingCategory, setEditingCategory] = useState<TransactionCategory | null>(null);
  const [editingRecurring, setEditingRecurring] = useState<RecurringTransaction | null>(null);
  
  const [newTransaction, setNewTransaction] = useState({
    type: "expense" as "income" | "expense",
    amount: "",
    category_id: "",
    description: "",
    transaction_date: format(new Date(), "yyyy-MM-dd"),
  });
  
  const [newBudget, setNewBudget] = useState({
    category_id: "",
    amount: "",
    period: "monthly" as "daily" | "weekly" | "monthly",
  });

  const [newCategory, setNewCategory] = useState({
    name: "",
    type: "expense" as "income" | "expense",
    color: "#6366f1",
  });

  const [newRecurring, setNewRecurring] = useState({
    type: "expense" as "income" | "expense",
    amount: "",
    category_id: "",
    description: "",
    frequency: "monthly" as "daily" | "weekly" | "monthly" | "yearly",
    day_of_month: 1,
    day_of_week: 1,
  });

  const [exportWhatsappNumber, setExportWhatsappNumber] = useState("");

  const [statPeriod, setStatPeriod] = useState<StatPeriod>("monthly");

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      // Fetch categories
      let { data: cats, error: catError } = await supabase
        .from("transaction_categories")
        .select("*")
        .eq("user_id", user.id);

      if (catError) throw catError;

      // Create default categories if none exist
      if (!cats || cats.length === 0) {
        const defaultCats = DEFAULT_CATEGORIES.map((c) => ({
          ...c,
          user_id: user.id,
        }));
        
        const { data: newCats, error: insertError } = await supabase
          .from("transaction_categories")
          .insert(defaultCats)
          .select();

        if (insertError) throw insertError;
        cats = newCats;
      }

      setCategories(cats as TransactionCategory[]);

      // Fetch transactions
      const { data: trans, error: transError } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("transaction_date", { ascending: false });

      if (transError) throw transError;

      const transWithCat = (trans || []).map((t) => ({
        ...t,
        amount: Number(t.amount),
        category: cats?.find((c) => c.id === t.category_id),
      }));
      setTransactions(transWithCat as Transaction[]);

      // Fetch budgets
      const { data: budgetData, error: budgetError } = await supabase
        .from("budgets")
        .select("*")
        .eq("user_id", user.id);

      if (budgetError) throw budgetError;

      const budgetsWithCat = (budgetData || []).map((b) => ({
        ...b,
        amount: Number(b.amount),
        category: cats?.find((c) => c.id === b.category_id),
      }));
      setBudgets(budgetsWithCat as Budget[]);

      // Fetch recurring transactions
      const { data: recurringData, error: recurringError } = await supabase
        .from("recurring_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (recurringError) throw recurringError;

      const recurringWithCat = (recurringData || []).map((r) => ({
        ...r,
        amount: Number(r.amount),
        category: cats?.find((c) => c.id === r.category_id),
      }));
      setRecurringTransactions(recurringWithCat as RecurringTransaction[]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTransaction = async () => {
    if (!user || !newTransaction.amount || !newTransaction.category_id) {
      toast({
        title: "Error",
        description: "Mohon lengkapi semua field",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.from("transactions").insert({
        user_id: user.id,
        type: newTransaction.type,
        amount: parseFloat(newTransaction.amount),
        category_id: newTransaction.category_id,
        description: newTransaction.description || null,
        transaction_date: newTransaction.transaction_date,
      });

      if (error) throw error;

      toast({ title: "Transaksi berhasil ditambahkan" });
      setShowAddTransaction(false);
      setNewTransaction({
        type: "expense",
        amount: "",
        category_id: "",
        description: "",
        transaction_date: format(new Date(), "yyyy-MM-dd"),
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUpdateTransaction = async () => {
    if (!editingTransaction) return;

    try {
      const { error } = await supabase
        .from("transactions")
        .update({
          type: newTransaction.type,
          amount: parseFloat(newTransaction.amount),
          category_id: newTransaction.category_id,
          description: newTransaction.description || null,
          transaction_date: newTransaction.transaction_date,
        })
        .eq("id", editingTransaction.id);

      if (error) throw error;

      toast({ title: "Transaksi berhasil diperbarui" });
      setEditingTransaction(null);
      setShowAddTransaction(false);
      setNewTransaction({
        type: "expense",
        amount: "",
        category_id: "",
        description: "",
        transaction_date: format(new Date(), "yyyy-MM-dd"),
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Transaksi dihapus" });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAddBudget = async () => {
    if (!user || !newBudget.amount || !newBudget.category_id) {
      toast({
        title: "Error",
        description: "Mohon lengkapi semua field",
        variant: "destructive",
      });
      return;
    }

    try {
      // Check if budget exists for this category and period
      const existing = budgets.find(
        (b) => b.category_id === newBudget.category_id && b.period === newBudget.period
      );

      if (existing) {
        const { error } = await supabase
          .from("budgets")
          .update({ amount: parseFloat(newBudget.amount) })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("budgets").insert({
          user_id: user.id,
          category_id: newBudget.category_id,
          amount: parseFloat(newBudget.amount),
          period: newBudget.period,
        });
        if (error) throw error;
      }

      toast({ title: "Budget berhasil disimpan" });
      setShowAddBudget(false);
      setNewBudget({ category_id: "", amount: "", period: "monthly" });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteBudget = async (id: string) => {
    try {
      const { error } = await supabase.from("budgets").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Budget dihapus" });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const openEditTransaction = (t: Transaction) => {
    setEditingTransaction(t);
    setNewTransaction({
      type: t.type,
      amount: t.amount.toString(),
      category_id: t.category_id || "",
      description: t.description || "",
      transaction_date: t.transaction_date,
    });
    setShowAddTransaction(true);
  };

  // Category management
  const handleAddCategory = async () => {
    if (!user || !newCategory.name.trim()) {
      toast({
        title: "Error",
        description: "Mohon masukkan nama kategori",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.from("transaction_categories").insert({
        user_id: user.id,
        name: newCategory.name.trim(),
        type: newCategory.type,
        color: newCategory.color,
      });

      if (error) throw error;

      toast({ title: "Kategori berhasil ditambahkan" });
      setShowAddCategory(false);
      setNewCategory({ name: "", type: "expense", color: "#6366f1" });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory || !newCategory.name.trim()) return;

    try {
      const { error } = await supabase
        .from("transaction_categories")
        .update({
          name: newCategory.name.trim(),
          type: newCategory.type,
          color: newCategory.color,
        })
        .eq("id", editingCategory.id);

      if (error) throw error;

      toast({ title: "Kategori berhasil diperbarui" });
      setEditingCategory(null);
      setShowAddCategory(false);
      setNewCategory({ name: "", type: "expense", color: "#6366f1" });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      // Check if category is used in transactions
      const { count } = await supabase
        .from("transactions")
        .select("id", { count: "exact" })
        .eq("category_id", categoryId);

      if (count && count > 0) {
        toast({
          title: "Tidak dapat menghapus",
          description: "Kategori masih digunakan oleh transaksi",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.from("transaction_categories").delete().eq("id", categoryId);
      if (error) throw error;
      toast({ title: "Kategori dihapus" });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const openEditCategory = (cat: TransactionCategory) => {
    setEditingCategory(cat);
    setNewCategory({
      name: cat.name,
      type: cat.type,
      color: cat.color,
    });
    setShowAddCategory(true);
  };

  // Export functions
  const handleExportExcel = () => {
    const data = filteredTransactions.map((t) => ({
      Tanggal: format(parseISO(t.transaction_date), "dd/MM/yyyy"),
      Tipe: t.type === "income" ? "Pemasukan" : "Pengeluaran",
      Kategori: t.category?.name || "Tidak berkategori",
      Jumlah: t.amount,
      Deskripsi: t.description || "-",
    }));

    // Add summary
    const summary = [
      {},
      { Tanggal: "RINGKASAN" },
      { Tanggal: "Total Pemasukan", Jumlah: totalIncome },
      { Tanggal: "Total Pengeluaran", Jumlah: totalExpense },
      { Tanggal: "Saldo", Jumlah: balance },
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet([...data, ...summary]);
    XLSX.utils.book_append_sheet(wb, ws, "Laporan Keuangan");
    XLSX.writeFile(wb, `Laporan_Keuangan_${periodLabel[statPeriod]}_${format(new Date(), "yyyyMMdd")}.xlsx`);
    
    toast({ title: "File Excel berhasil diunduh" });
  };

  const generateWhatsappReport = () => {
    let report = `📊 *LAPORAN KEUANGAN*\n`;
    report += `📅 Periode: ${periodLabel[statPeriod]}\n`;
    report += `📆 Tanggal: ${format(new Date(), "dd MMMM yyyy", { locale: id })}\n\n`;
    
    report += `💰 *RINGKASAN*\n`;
    report += `┌─────────────────────\n`;
    report += `│ 📈 Pemasukan: ${formatCurrency(totalIncome)}\n`;
    report += `│ 📉 Pengeluaran: ${formatCurrency(totalExpense)}\n`;
    report += `│ 💵 Saldo: ${formatCurrency(balance)}\n`;
    report += `└─────────────────────\n\n`;

    if (filteredTransactions.length > 0) {
      report += `📋 *DETAIL TRANSAKSI*\n`;
      filteredTransactions.slice(0, 20).forEach((t, i) => {
        const icon = t.type === "income" ? "🟢" : "🔴";
        report += `${icon} ${t.category?.name || "Lainnya"}: ${t.type === "income" ? "+" : "-"}${formatCurrency(t.amount)}\n`;
        if (t.description) report += `   └ ${t.description}\n`;
      });
      if (filteredTransactions.length > 20) {
        report += `\n... dan ${filteredTransactions.length - 20} transaksi lainnya\n`;
      }
    }

    report += `\n_Dikirim dari Aktivitas-Ku_`;
    return report;
  };

  const handleSendWhatsapp = () => {
    if (!exportWhatsappNumber.trim()) {
      toast({
        title: "Error",
        description: "Mohon masukkan nomor WhatsApp",
        variant: "destructive",
      });
      return;
    }

    // Clean phone number
    let phone = exportWhatsappNumber.trim().replace(/\D/g, "");
    if (phone.startsWith("0")) {
      phone = "62" + phone.substring(1);
    } else if (!phone.startsWith("62")) {
      phone = "62" + phone;
    }

    const report = generateWhatsappReport();
    const encodedReport = encodeURIComponent(report);
    const whatsappUrl = `https://wa.me/${phone}?text=${encodedReport}`;
    
    window.open(whatsappUrl, "_blank");
    setShowExportDialog(false);
    toast({ title: "Membuka WhatsApp..." });
  };

  // Recurring transaction handlers
  const handleAddRecurring = async () => {
    if (!user || !newRecurring.amount || !newRecurring.category_id) {
      toast({
        title: "Error",
        description: "Mohon lengkapi semua field",
        variant: "destructive",
      });
      return;
    }

    try {
      const nextDue = calculateNextDueDate(newRecurring.frequency, newRecurring.day_of_month, newRecurring.day_of_week);
      
      const { error } = await supabase.from("recurring_transactions").insert({
        user_id: user.id,
        type: newRecurring.type,
        amount: parseFloat(newRecurring.amount),
        category_id: newRecurring.category_id,
        description: newRecurring.description || null,
        frequency: newRecurring.frequency,
        day_of_month: newRecurring.frequency === "monthly" || newRecurring.frequency === "yearly" ? newRecurring.day_of_month : null,
        day_of_week: newRecurring.frequency === "weekly" ? newRecurring.day_of_week : null,
        next_due_date: format(nextDue, "yyyy-MM-dd"),
        is_active: true,
      });

      if (error) throw error;

      toast({ title: "Transaksi berulang berhasil ditambahkan" });
      setShowAddRecurring(false);
      resetRecurringForm();
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUpdateRecurring = async () => {
    if (!editingRecurring) return;

    try {
      const nextDue = calculateNextDueDate(newRecurring.frequency, newRecurring.day_of_month, newRecurring.day_of_week);
      
      const { error } = await supabase
        .from("recurring_transactions")
        .update({
          type: newRecurring.type,
          amount: parseFloat(newRecurring.amount),
          category_id: newRecurring.category_id,
          description: newRecurring.description || null,
          frequency: newRecurring.frequency,
          day_of_month: newRecurring.frequency === "monthly" || newRecurring.frequency === "yearly" ? newRecurring.day_of_month : null,
          day_of_week: newRecurring.frequency === "weekly" ? newRecurring.day_of_week : null,
          next_due_date: format(nextDue, "yyyy-MM-dd"),
        })
        .eq("id", editingRecurring.id);

      if (error) throw error;

      toast({ title: "Transaksi berulang berhasil diperbarui" });
      setEditingRecurring(null);
      setShowAddRecurring(false);
      resetRecurringForm();
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleToggleRecurringActive = async (recurring: RecurringTransaction) => {
    try {
      const { error } = await supabase
        .from("recurring_transactions")
        .update({ is_active: !recurring.is_active })
        .eq("id", recurring.id);

      if (error) throw error;

      toast({ 
        title: recurring.is_active ? "Transaksi berulang dinonaktifkan" : "Transaksi berulang diaktifkan" 
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteRecurring = async (id: string) => {
    try {
      const { error } = await supabase.from("recurring_transactions").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Transaksi berulang dihapus" });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleProcessRecurring = async (recurring: RecurringTransaction) => {
    if (!user) return;

    try {
      // Create actual transaction
      const { error: transError } = await supabase.from("transactions").insert({
        user_id: user.id,
        type: recurring.type,
        amount: recurring.amount,
        category_id: recurring.category_id,
        description: `[Berulang] ${recurring.description || recurring.category?.name}`,
        transaction_date: format(new Date(), "yyyy-MM-dd"),
      });

      if (transError) throw transError;

      // Update next due date
      const nextDue = calculateNextDueFromCurrent(
        parseISO(recurring.next_due_date), 
        recurring.frequency,
        recurring.day_of_month,
        recurring.day_of_week
      );

      const { error: updateError } = await supabase
        .from("recurring_transactions")
        .update({ 
          next_due_date: format(nextDue, "yyyy-MM-dd"),
          last_processed_date: format(new Date(), "yyyy-MM-dd")
        })
        .eq("id", recurring.id);

      if (updateError) throw updateError;

      toast({ title: "Transaksi berhasil diproses" });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const openEditRecurring = (r: RecurringTransaction) => {
    setEditingRecurring(r);
    setNewRecurring({
      type: r.type,
      amount: r.amount.toString(),
      category_id: r.category_id || "",
      description: r.description || "",
      frequency: r.frequency,
      day_of_month: r.day_of_month || 1,
      day_of_week: r.day_of_week || 1,
    });
    setShowAddRecurring(true);
  };

  const resetRecurringForm = () => {
    setNewRecurring({
      type: "expense",
      amount: "",
      category_id: "",
      description: "",
      frequency: "monthly",
      day_of_month: 1,
      day_of_week: 1,
    });
  };

  const calculateNextDueDate = (
    frequency: "daily" | "weekly" | "monthly" | "yearly",
    dayOfMonth: number,
    dayOfWeek: number
  ) => {
    const now = new Date();
    switch (frequency) {
      case "daily":
        return addDays(now, 1);
      case "weekly":
        const daysUntilNext = (dayOfWeek - now.getDay() + 7) % 7 || 7;
        return addDays(now, daysUntilNext);
      case "monthly":
        const nextMonth = now.getDate() > dayOfMonth ? addMonths(now, 1) : now;
        return new Date(nextMonth.getFullYear(), nextMonth.getMonth(), Math.min(dayOfMonth, 28));
      case "yearly":
        return addYears(now, 1);
    }
  };

  const calculateNextDueFromCurrent = (
    current: Date,
    frequency: "daily" | "weekly" | "monthly" | "yearly",
    dayOfMonth: number | null,
    dayOfWeek: number | null
  ) => {
    switch (frequency) {
      case "daily":
        return addDays(current, 1);
      case "weekly":
        return addWeeks(current, 1);
      case "monthly":
        return addMonths(current, 1);
      case "yearly":
        return addYears(current, 1);
    }
  };

  const frequencyLabel = {
    daily: "Harian",
    weekly: "Mingguan",
    monthly: "Bulanan",
    yearly: "Tahunan",
  };

  const dayOfWeekLabel = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

  const getDateRange = (period: StatPeriod) => {
    const now = new Date();
    switch (period) {
      case "daily":
        return { start: startOfDay(now), end: endOfDay(now) };
      case "weekly":
        return { start: startOfWeek(now, { locale: id }), end: endOfWeek(now, { locale: id }) };
      case "monthly":
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  const getFilteredTransactions = (period: StatPeriod) => {
    const { start, end } = getDateRange(period);
    return transactions.filter((t) => {
      const date = parseISO(t.transaction_date);
      return date >= start && date <= end;
    });
  };

  const filteredTransactions = getFilteredTransactions(statPeriod);
  
  const totalIncome = filteredTransactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalExpense = filteredTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  
  const balance = totalIncome - totalExpense;

  // Chart data
  const expenseByCategory = categories
    .filter((c) => c.type === "expense")
    .map((cat) => {
      const total = filteredTransactions
        .filter((t) => t.category_id === cat.id)
        .reduce((sum, t) => sum + t.amount, 0);
      return { name: cat.name, value: total, color: cat.color };
    })
    .filter((c) => c.value > 0);

  const incomeByCategory = categories
    .filter((c) => c.type === "income")
    .map((cat) => {
      const total = filteredTransactions
        .filter((t) => t.category_id === cat.id)
        .reduce((sum, t) => sum + t.amount, 0);
      return { name: cat.name, value: total, color: cat.color };
    })
    .filter((c) => c.value > 0);

  // Budget progress
  const getBudgetProgress = (budget: Budget) => {
    const { start, end } = getDateRange(budget.period);
    const spent = transactions
      .filter((t) => {
        if (t.category_id !== budget.category_id) return false;
        const date = parseISO(t.transaction_date);
        return date >= start && date <= end;
      })
      .reduce((sum, t) => sum + t.amount, 0);
    
    const percentage = Math.min((spent / budget.amount) * 100, 100);
    const isOver = spent > budget.amount;
    return { spent, percentage, isOver };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const periodLabel = {
    daily: "Hari Ini",
    weekly: "Minggu Ini",
    monthly: "Bulan Ini",
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-bold">Keuangan</h1>
            <p className="text-muted-foreground">Kelola pemasukan dan pengeluaranmu</p>
          </div>
          <div className="flex gap-2 flex-wrap">
          {isPremium ? (
            <Dialog open={showAddBudget} onOpenChange={setShowAddBudget}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Target className="h-4 w-4 mr-2" />
                  Budget
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Atur Budget</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Kategori</Label>
                    <Select
                      value={newBudget.category_id}
                      onValueChange={(v) => setNewBudget({ ...newBudget, category_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih kategori" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories
                          .filter((c) => c.type === "expense")
                          .map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Periode</Label>
                    <Select
                      value={newBudget.period}
                      onValueChange={(v: "daily" | "weekly" | "monthly") =>
                        setNewBudget({ ...newBudget, period: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Harian</SelectItem>
                        <SelectItem value="weekly">Mingguan</SelectItem>
                        <SelectItem value="monthly">Bulanan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Jumlah Budget</Label>
                    <Input
                      type="number"
                      placeholder="100000"
                      value={newBudget.amount}
                      onChange={(e) => setNewBudget({ ...newBudget, amount: e.target.value })}
                    />
                  </div>
                  <Button onClick={handleAddBudget} className="w-full">
                    Simpan Budget
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          ) : (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setPremiumFeatureName("Budget");
                setShowPremiumDialog(true);
              }}
            >
              <Target className="h-4 w-4 mr-2" />
              Budget
              <Crown className="h-3.5 w-3.5 ml-2 text-amber-500" />
            </Button>
          )}

          <Dialog open={showAddTransaction} onOpenChange={(open) => {
            setShowAddTransaction(open);
            if (!open) {
              setEditingTransaction(null);
              setNewTransaction({
                type: "expense",
                amount: "",
                category_id: "",
                description: "",
                transaction_date: format(new Date(), "yyyy-MM-dd"),
              });
            }
          }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Transaksi
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingTransaction ? "Edit Transaksi" : "Tambah Transaksi"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Tipe</Label>
                  <Select
                    value={newTransaction.type}
                    onValueChange={(v: "income" | "expense") => {
                      setNewTransaction({ ...newTransaction, type: v, category_id: "" });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Pemasukan</SelectItem>
                      <SelectItem value="expense">Pengeluaran</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Kategori</Label>
                  <Select
                    value={newTransaction.category_id}
                    onValueChange={(v) => setNewTransaction({ ...newTransaction, category_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories
                        .filter((c) => c.type === newTransaction.type)
                        .map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Jumlah</Label>
                  <Input
                    type="number"
                    placeholder="50000"
                    value={newTransaction.amount}
                    onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Tanggal</Label>
                  <Input
                    type="date"
                    value={newTransaction.transaction_date}
                    onChange={(e) =>
                      setNewTransaction({ ...newTransaction, transaction_date: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Deskripsi (opsional)</Label>
                  <Input
                    placeholder="Catatan transaksi"
                    value={newTransaction.description}
                    onChange={(e) =>
                      setNewTransaction({ ...newTransaction, description: e.target.value })
                    }
                  />
                </div>
                <Button
                  onClick={editingTransaction ? handleUpdateTransaction : handleAddTransaction}
                  className="w-full"
                >
                  {editingTransaction ? "Simpan Perubahan" : "Tambah Transaksi"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Add Category Dialog */}
          <Dialog open={showAddCategory} onOpenChange={(open) => {
            setShowAddCategory(open);
            if (!open) {
              setEditingCategory(null);
              setNewCategory({ name: "", type: "expense", color: "#6366f1" });
            }
          }}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Tag className="h-4 w-4 mr-2" />
                Kategori
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingCategory ? "Edit Kategori" : "Tambah Kategori"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nama Kategori</Label>
                  <Input
                    placeholder="Nama kategori"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Tipe</Label>
                  <Select
                    value={newCategory.type}
                    onValueChange={(v: "income" | "expense") =>
                      setNewCategory({ ...newCategory, type: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Pemasukan</SelectItem>
                      <SelectItem value="expense">Pengeluaran</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Warna</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="color"
                      value={newCategory.color}
                      onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                      className="w-16 h-10 p-1"
                    />
                    <span className="text-sm text-muted-foreground">{newCategory.color}</span>
                  </div>
                </div>
                <Button
                  onClick={editingCategory ? handleUpdateCategory : handleAddCategory}
                  className="w-full"
                >
                  {editingCategory ? "Simpan Perubahan" : "Tambah Kategori"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Export Dialog */}
          {isPremium ? (
            <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Ekspor
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ekspor Laporan Keuangan</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Periode: {periodLabel[statPeriod]} | {filteredTransactions.length} transaksi
                  </p>
                  
                  <Button onClick={handleExportExcel} className="w-full" variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Download Excel (.xlsx)
                  </Button>

                  <div className="border-t pt-4">
                    <Label className="flex items-center gap-2 mb-2">
                      <MessageCircle className="h-4 w-4" />
                      Kirim ke WhatsApp
                    </Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="08123456789"
                          value={exportWhatsappNumber}
                          onChange={(e) => setExportWhatsappNumber(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <Button onClick={handleSendWhatsapp}>
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Kirim
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Masukkan nomor tanpa tanda + atau spasi
                    </p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          ) : (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setPremiumFeatureName("Export");
                setShowPremiumDialog(true);
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Ekspor
              <Crown className="h-3.5 w-3.5 ml-2 text-amber-500" />
            </Button>
          )}

          {/* Recurring Transaction Dialog */}
          <Dialog open={showAddRecurring} onOpenChange={(open) => {
            setShowAddRecurring(open);
            if (!open) {
              setEditingRecurring(null);
              resetRecurringForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Berulang
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingRecurring ? "Edit Transaksi Berulang" : "Tambah Transaksi Berulang"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Tipe</Label>
                  <Select
                    value={newRecurring.type}
                    onValueChange={(v: "income" | "expense") => {
                      setNewRecurring({ ...newRecurring, type: v, category_id: "" });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Pemasukan</SelectItem>
                      <SelectItem value="expense">Pengeluaran</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Kategori</Label>
                  <Select
                    value={newRecurring.category_id}
                    onValueChange={(v) => setNewRecurring({ ...newRecurring, category_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories
                        .filter((c) => c.type === newRecurring.type)
                        .map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Jumlah</Label>
                  <Input
                    type="number"
                    placeholder="50000"
                    value={newRecurring.amount}
                    onChange={(e) => setNewRecurring({ ...newRecurring, amount: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Frekuensi</Label>
                  <Select
                    value={newRecurring.frequency}
                    onValueChange={(v: "daily" | "weekly" | "monthly" | "yearly") => {
                      setNewRecurring({ ...newRecurring, frequency: v });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Harian</SelectItem>
                      <SelectItem value="weekly">Mingguan</SelectItem>
                      <SelectItem value="monthly">Bulanan</SelectItem>
                      <SelectItem value="yearly">Tahunan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {newRecurring.frequency === "weekly" && (
                  <div>
                    <Label>Hari</Label>
                    <Select
                      value={newRecurring.day_of_week.toString()}
                      onValueChange={(v) => setNewRecurring({ ...newRecurring, day_of_week: parseInt(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {dayOfWeekLabel.map((day, i) => (
                          <SelectItem key={i} value={i.toString()}>{day}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {(newRecurring.frequency === "monthly" || newRecurring.frequency === "yearly") && (
                  <div>
                    <Label>Tanggal</Label>
                    <Select
                      value={newRecurring.day_of_month.toString()}
                      onValueChange={(v) => setNewRecurring({ ...newRecurring, day_of_month: parseInt(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 28 }, (_, i) => (
                          <SelectItem key={i + 1} value={(i + 1).toString()}>{i + 1}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <Label>Deskripsi (opsional)</Label>
                  <Input
                    placeholder="Catatan transaksi"
                    value={newRecurring.description}
                    onChange={(e) => setNewRecurring({ ...newRecurring, description: e.target.value })}
                  />
                </div>
                <Button
                  onClick={editingRecurring ? handleUpdateRecurring : handleAddRecurring}
                  className="w-full"
                >
                  {editingRecurring ? "Simpan Perubahan" : "Tambah Transaksi Berulang"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pemasukan</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pengeluaran</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpense)}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Saldo</p>
                <p className={`text-2xl font-bold ${balance >= 0 ? "text-blue-600" : "text-red-600"}`}>
                  {formatCurrency(balance)}
                </p>
              </div>
              <Wallet className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Period Selector */}
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Statistik:</span>
        <div className="flex gap-1">
          {(["daily", "weekly", "monthly"] as StatPeriod[]).map((p) => (
            <Button
              key={p}
              variant={statPeriod === p ? "default" : "ghost"}
              size="sm"
              onClick={() => setStatPeriod(p)}
            >
              {periodLabel[p]}
            </Button>
          ))}
        </div>
      </div>

      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="transactions">Transaksi</TabsTrigger>
          <TabsTrigger value="recurring">Berulang</TabsTrigger>
          <TabsTrigger value="statistics">Statistik</TabsTrigger>
          <TabsTrigger value="budgets">Budget</TabsTrigger>
          <TabsTrigger value="categories">Kategori</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-4">
          {filteredTransactions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Belum ada transaksi {periodLabel[statPeriod].toLowerCase()}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredTransactions.map((t) => (
                <Card key={t.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: t.category?.color || "#6b7280" }}
                      />
                      <div>
                        <p className="font-medium">{t.category?.name || "Tidak berkategori"}</p>
                        {t.description && (
                          <p className="text-sm text-muted-foreground">{t.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(t.transaction_date), "dd MMM yyyy", { locale: id })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-semibold ${
                          t.type === "income" ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {t.type === "income" ? "+" : "-"}
                        {formatCurrency(t.amount)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditTransaction(t)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteTransaction(t.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="recurring" className="space-y-4">
          {recurringTransactions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <RefreshCw className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Belum ada transaksi berulang</p>
                <p className="text-sm">Klik tombol "Berulang" untuk menambahkan</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {recurringTransactions.map((r) => (
                <Card key={r.id} className={!r.is_active ? "opacity-60" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: r.category?.color || "#6b7280" }}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{r.category?.name || "Tidak berkategori"}</p>
                            <Badge variant={r.is_active ? "default" : "secondary"} className="text-xs">
                              {r.is_active ? "Aktif" : "Nonaktif"}
                            </Badge>
                          </div>
                          {r.description && (
                            <p className="text-sm text-muted-foreground">{r.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <Badge variant="outline">{frequencyLabel[r.frequency]}</Badge>
                            {r.frequency === "weekly" && r.day_of_week !== null && (
                              <span>Setiap {dayOfWeekLabel[r.day_of_week]}</span>
                            )}
                            {(r.frequency === "monthly" || r.frequency === "yearly") && r.day_of_month !== null && (
                              <span>Tanggal {r.day_of_month}</span>
                            )}
                            <span>• Selanjutnya: {format(parseISO(r.next_due_date), "dd MMM yyyy", { locale: id })}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-semibold ${
                            r.type === "income" ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {r.type === "income" ? "+" : "-"}
                          {formatCurrency(r.amount)}
                        </span>
                        <div className="flex items-center gap-1">
                          <Switch
                            checked={r.is_active}
                            onCheckedChange={() => handleToggleRecurringActive(r)}
                            className="data-[state=checked]:bg-green-600"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleProcessRecurring(r)}
                            title="Proses sekarang"
                            disabled={!r.is_active}
                          >
                            <Play className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditRecurring(r)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteRecurring(r.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="statistics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5" />
                  Pengeluaran per Kategori
                </CardTitle>
              </CardHeader>
              <CardContent>
                {expenseByCategory.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Tidak ada data</p>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={expenseByCategory}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, percent }) =>
                          `${name} (${(percent * 100).toFixed(0)}%)`
                        }
                      >
                        {expenseByCategory.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5" />
                  Pemasukan per Kategori
                </CardTitle>
              </CardHeader>
              <CardContent>
                {incomeByCategory.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Tidak ada data</p>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={incomeByCategory}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, percent }) =>
                          `${name} (${(percent * 100).toFixed(0)}%)`
                        }
                      >
                        {incomeByCategory.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Perbandingan Pemasukan vs Pengeluaran</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={[
                    { name: "Pemasukan", value: totalIncome, fill: "#22c55e" },
                    { name: "Pengeluaran", value: totalExpense, fill: "#ef4444" },
                  ]}
                >
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(v) => formatCurrency(v)} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="value" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="budgets" className="space-y-4">
          {budgets.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Belum ada budget yang diatur
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {budgets.map((b) => {
                const { spent, percentage, isOver } = getBudgetProgress(b);
                return (
                  <Card key={b.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: b.category?.color || "#6b7280" }}
                          />
                          <span className="font-medium">{b.category?.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {b.period === "daily"
                              ? "Harian"
                              : b.period === "weekly"
                              ? "Mingguan"
                              : "Bulanan"}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteBudget(b.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      <Progress
                        value={percentage}
                        className={`h-2 ${isOver ? "[&>div]:bg-red-500" : ""}`}
                      />
                      <div className="flex justify-between mt-2 text-sm">
                        <span className={isOver ? "text-red-600" : "text-muted-foreground"}>
                          {formatCurrency(spent)} / {formatCurrency(b.amount)}
                        </span>
                        <span className={isOver ? "text-red-600 font-medium" : "text-muted-foreground"}>
                          {isOver ? "Melebihi budget!" : `${percentage.toFixed(0)}%`}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Income Categories */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Kategori Pemasukan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {categories.filter(c => c.type === "income").length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">Belum ada kategori</p>
                ) : (
                  categories.filter(c => c.type === "income").map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between p-2 rounded-lg border">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span>{cat.name}</span>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditCategory(cat)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteCategory(cat.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Expense Categories */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                  Kategori Pengeluaran
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {categories.filter(c => c.type === "expense").length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">Belum ada kategori</p>
                ) : (
                  categories.filter(c => c.type === "expense").map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between p-2 rounded-lg border">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span>{cat.name}</span>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditCategory(cat)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteCategory(cat.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Premium Dialog */}
      <PremiumDialog 
        open={showPremiumDialog} 
        onOpenChange={setShowPremiumDialog}
        featureName={premiumFeatureName}
      />
    </div>
    </AppLayout>
  );
}
