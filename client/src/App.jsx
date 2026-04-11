import { Navigate, Route, Routes } from "react-router-dom";
import AdminLayout from "./components/layout/AdminLayout";
import CustomerLayout from "./components/layout/CustomerLayout";
import {
  AdminRoute,
  CustomerRoute,
  ProtectedRoute,
  RootRedirect,
} from "./routes/RouteGuards";
import SignIn from "./pages/SignIn";
import CustomerHome from "./pages/customer/CustomerHome";
import CustomerProductDetail from "./pages/customer/CustomerProductDetail";
import CustomerProfilePage from "./pages/customer/CustomerProfilePage";
import CheckoutPage from "./pages/customer/CheckoutPage";
import CustomerSearchResultsPage from "./pages/customer/CustomerSearchResultsPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProductsPage from "./pages/admin/AdminProductsPage";
import AdminProductCreatePage from "./pages/admin/AdminProductCreatePage";
import AdminProductEditPage from "./pages/admin/AdminProductEditPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/signin" element={<SignIn />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<CustomerRoute />}>
          <Route element={<CustomerLayout />}>
            <Route path="/home" element={<CustomerHome />} />
            <Route path="/products/:id" element={<CustomerProductDetail />} />
            <Route path="/profile" element={<CustomerProfilePage />} />
            <Route
              path="/orders"
              element={<Navigate to="/profile" replace />}
            />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/search" element={<CustomerSearchResultsPage />} />
          </Route>
        </Route>

        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="products" element={<AdminProductsPage />} />
            <Route path="products/new" element={<AdminProductCreatePage />} />
            <Route
              path="products/edit/:id"
              element={<AdminProductEditPage />}
            />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
