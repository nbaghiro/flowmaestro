// Product operations
export { listProductsOperation, executeListProducts } from "./listProducts";
export { getProductOperation, executeGetProduct } from "./getProduct";
export { createProductOperation, executeCreateProduct } from "./createProduct";
export { updateProductOperation, executeUpdateProduct } from "./updateProduct";

// Order operations
export { listOrdersOperation, executeListOrders } from "./listOrders";
export { getOrderOperation, executeGetOrder } from "./getOrder";
export { updateOrderStatusOperation, executeUpdateOrderStatus } from "./updateOrderStatus";

// Customer operations
export { listCustomersOperation, executeListCustomers } from "./listCustomers";
export { getCustomerOperation, executeGetCustomer } from "./getCustomer";
export { createCustomerOperation, executeCreateCustomer } from "./createCustomer";

// Inventory operations
export { getInventoryOperation, executeGetInventory } from "./getInventory";
export { updateInventoryOperation, executeUpdateInventory } from "./updateInventory";

// Category operations
export { listCategoriesOperation, executeListCategories } from "./listCategories";

// Types
export * from "./types";
