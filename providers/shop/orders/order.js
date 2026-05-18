const app = getApp();
const { graphqlClient } = require('../../../utils/api.js');

const GET_ACTIVE_ORDER = `
  query GetActiveOrder {
    activeOrder {
      id
      code
      state
      totalWithTax
      currencyCode
      lines {
        id
        quantity
        unitPriceWithTax
        linePriceWithTax
        productVariant {
          id
          name
          sku
          price
          priceWithTax
          stockLevel
          featuredAsset {
            id
            preview
          }
          product {
            id
            name
            slug
          }
        }
      }
    }
  }
`;

const ADD_ITEM_TO_ORDER = `
  mutation AddItemToOrder($productVariantId: ID!, $quantity: Int!) {
    addItemToOrder(productVariantId: $productVariantId, quantity: $quantity) {
      ... on Order {
        id
        code
        state
        totalWithTax
        lines {
          id
          quantity
          unitPriceWithTax
          linePriceWithTax
        }
      }
      ... on OrderModificationError {
        errorCode
        message
      }
    }
  }
`;

const UPDATE_ORDER_LINE = `
  mutation UpdateOrderLine($orderLineId: ID!, $quantity: Int!) {
    adjustOrderLine(orderLineId: $orderLineId, quantity: $quantity) {
      ... on Order {
        id
        code
        state
        totalWithTax
        lines {
          id
          quantity
          unitPriceWithTax
          linePriceWithTax
        }
      }
      ... on OrderModificationError {
        errorCode
        message
      }
    }
  }
`;

const REMOVE_ORDER_LINE = `
  mutation RemoveOrderLine($orderLineId: ID!) {
    removeOrderLine(orderLineId: $orderLineId) {
      ... on Order {
        id
        code
        state
        totalWithTax
        lines {
          id
        }
      }
      ... on OrderModificationError {
        errorCode
        message
      }
    }
  }
`;

const GET_CUSTOMER_ORDERS = `
  query GetCustomerOrders($options: OrderListOptions) {
    activeCustomer {
      id
      orders(options: $options) {
        totalItems
        items {
          id
          code
          state
          totalWithTax
          currencyCode
          createdAt
          lines {
            id
            quantity
            productVariant {
              id
              name
              featuredAsset {
                id
                preview
              }
            }
          }
        }
      }
    }
  }
`;

async function getActiveOrder() {
  try {
    const token = app.globalData.token;
    const data = await graphqlClient.query(GET_ACTIVE_ORDER, {}, token);
    return data.activeOrder;
  } catch (error) {
    console.error('Failed to fetch active order:', error);
    return null;
  }
}

async function addItemToOrder(productVariantId, quantity) {
  try {
    const token = app.globalData.token;
    const data = await graphqlClient.mutate(
      ADD_ITEM_TO_ORDER,
      { productVariantId, quantity },
      token
    );

    const result = data.addItemToOrder;

    if (result && result.errorCode) {
      throw new Error(result.message || 'Failed to add item');
    }

    return result;
  } catch (error) {
    console.error('Failed to add item to order:', error);
    throw error;
  }
}

async function updateOrderLine(orderLineId, quantity) {
  try {
    const token = app.globalData.token;
    const data = await graphqlClient.mutate(
      UPDATE_ORDER_LINE,
      { orderLineId, quantity },
      token
    );

    const result = data.adjustOrderLine;

    if (result && result.errorCode) {
      throw new Error(result.message || 'Failed to update order');
    }

    return result;
  } catch (error) {
    console.error('Failed to update order line:', error);
    throw error;
  }
}

async function removeOrderLine(orderLineId) {
  try {
    const token = app.globalData.token;
    const data = await graphqlClient.mutate(
      REMOVE_ORDER_LINE,
      { orderLineId },
      token
    );

    const result = data.removeOrderLine;

    if (result && result.errorCode) {
      throw new Error(result.message || 'Failed to remove item');
    }

    return result;
  } catch (error) {
    console.error('Failed to remove order line:', error);
    throw error;
  }
}

async function getCustomerOrders(options = {}) {
  try {
    const token = app.globalData.token;
    const defaultOptions = {
      skip: 0,
      take: 10,
      sort: {
        createdAt: 'DESC',
      },
    };

    const mergedOptions = { ...defaultOptions, ...options };
    const data = await graphqlClient.query(
      GET_CUSTOMER_ORDERS,
      { options: mergedOptions },
      token
    );

    return {
      items: data.activeCustomer && data.activeCustomer.orders && data.activeCustomer.orders.items || [],
      totalItems: data.activeCustomer && data.activeCustomer.orders && data.activeCustomer.orders.totalItems || 0,
    };
  } catch (error) {
    console.error('Failed to fetch customer orders:', error);
    return { items: [], totalItems: 0 };
  }
}

module.exports = {
  getActiveOrder,
  addItemToOrder,
  updateOrderLine,
  removeOrderLine,
  getCustomerOrders,
};