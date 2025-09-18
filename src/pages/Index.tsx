import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Users, DollarSign, BarChart3, Shield } from 'lucide-react';

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">EquiShare</h1>
          <Button asChild>
            <Link to="/auth">Get Started</Link>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-6">
          Smart Expense Sharing
          <span className="block text-primary">Made Simple</span>
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Split bills, track expenses, and settle up with friends. EquiShare makes group finances transparent and fair.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" asChild>
            <Link to="/auth">Start Sharing</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link to="/auth">Learn More</Link>
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Why Choose EquiShare?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Group Management</h3>
            <p className="text-muted-foreground">Create groups for roommates, trips, or any shared expenses.</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <DollarSign className="h-6 w-6 text-secondary" />
            </div>
            <h3 className="font-semibold mb-2">Smart Splitting</h3>
            <p className="text-muted-foreground">Automatically calculate who owes what with intelligent splitting.</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="h-6 w-6 text-accent" />
            </div>
            <h3 className="font-semibold mb-2">Expense Analytics</h3>
            <p className="text-muted-foreground">Track spending patterns and get insights into your group expenses.</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Shield className="h-6 w-6 text-destructive" />
            </div>
            <h3 className="font-semibold mb-2">Secure & Private</h3>
            <p className="text-muted-foreground">Your financial data is protected with enterprise-grade security.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card">
        <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
          <p>&copy; 2024 EquiShare. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
