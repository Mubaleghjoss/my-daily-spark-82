-- Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.is_admin(auth.uid()));

-- Allow admins to view all activities
CREATE POLICY "Admins can view all activities"
ON public.activities
FOR SELECT
USING (public.is_admin(auth.uid()));

-- Allow admins to view all activity_completions
CREATE POLICY "Admins can view all activity_completions"
ON public.activity_completions
FOR SELECT
USING (public.is_admin(auth.uid()));

-- Allow admins to view all categories
CREATE POLICY "Admins can view all categories"
ON public.categories
FOR SELECT
USING (public.is_admin(auth.uid()));

-- Allow admins to view all notes
CREATE POLICY "Admins can view all notes"
ON public.notes
FOR SELECT
USING (public.is_admin(auth.uid()));

-- Allow admins to view all transactions
CREATE POLICY "Admins can view all transactions"
ON public.transactions
FOR SELECT
USING (public.is_admin(auth.uid()));

-- Allow admins to view all transaction_categories
CREATE POLICY "Admins can view all transaction_categories"
ON public.transaction_categories
FOR SELECT
USING (public.is_admin(auth.uid()));

-- Allow admins to view all budgets
CREATE POLICY "Admins can view all budgets"
ON public.budgets
FOR SELECT
USING (public.is_admin(auth.uid()));

-- Allow admins to view all recurring_transactions
CREATE POLICY "Admins can view all recurring_transactions"
ON public.recurring_transactions
FOR SELECT
USING (public.is_admin(auth.uid()));

-- Allow admins to view all prayers_advices
CREATE POLICY "Admins can view all prayers_advices"
ON public.prayers_advices
FOR SELECT
USING (public.is_admin(auth.uid()));

-- Allow admins to view all prayer_categories
CREATE POLICY "Admins can view all prayer_categories"
ON public.prayer_categories
FOR SELECT
USING (public.is_admin(auth.uid()));

-- Allow admins to view all pomodoro_sessions
CREATE POLICY "Admins can view all pomodoro_sessions"
ON public.pomodoro_sessions
FOR SELECT
USING (public.is_admin(auth.uid()));

-- Allow admins to view all reminders
CREATE POLICY "Admins can view all reminders"
ON public.reminders
FOR SELECT
USING (public.is_admin(auth.uid()));