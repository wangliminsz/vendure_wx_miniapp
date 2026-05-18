const app = getApp();
const { graphqlClient } = require('../../../utils/api.js');

const GET_ACTIVE_CUSTOMER = `
  query GetActiveCustomer {
    activeCustomer {
      id
      firstName
      lastName
      emailAddress
      phoneNumber
      company {
        id
        name
      }
    }
  }
`;

const GET_CUSTOMER_ADDRESSES = `
  query GetCustomerAddresses {
    activeCustomer {
      id
      addresses {
        id
        fullName
        company
        streetLine1
        streetLine2
        city
        province
        postalCode
        country {
          code
          name
        }
        phoneNumber
        defaultShippingAddress
        defaultBillingAddress
      }
    }
  }
`;

const CREATE_ADDRESS = `
  mutation CreateCustomerAddress($input: CreateAddressInput!) {
    createCustomerAddress(input: $input) {
      id
      fullName
      company
      streetLine1
      streetLine2
      city
      province
      postalCode
      country {
        code
        name
      }
      phoneNumber
      defaultShippingAddress
      defaultBillingAddress
    }
  }
`;

const UPDATE_ADDRESS = `
  mutation UpdateCustomerAddress($input: UpdateAddressInput!) {
    updateCustomerAddress(input: $input) {
      id
      fullName
      company
      streetLine1
      streetLine2
      city
      province
      postalCode
      country {
        code
        name
      }
      phoneNumber
      defaultShippingAddress
      defaultBillingAddress
    }
  }
`;

const DELETE_ADDRESS = `
  mutation DeleteCustomerAddress($id: ID!) {
    deleteCustomerAddress(id: $id) {
      success
    }
  }
`;

async function getActiveCustomer() {
  try {
    const token = app.globalData.token;
    const data = await graphqlClient.query(GET_ACTIVE_CUSTOMER, {}, token);
    return data.activeCustomer;
  } catch (error) {
    console.error('Failed to fetch active customer:', error);
    return null;
  }
}

async function getCustomerAddresses() {
  try {
    const token = app.globalData.token;
    const data = await graphqlClient.query(GET_CUSTOMER_ADDRESSES, {}, token);
    return data.activeCustomer && data.activeCustomer.addresses || [];
  } catch (error) {
    console.error('Failed to fetch customer addresses:', error);
    return [];
  }
}

async function createAddress(input) {
  try {
    const token = app.globalData.token;
    const data = await graphqlClient.mutate(CREATE_ADDRESS, { input }, token);
    return data.createCustomerAddress;
  } catch (error) {
    console.error('Failed to create address:', error);
    throw error;
  }
}

async function updateAddress(input) {
  try {
    const token = app.globalData.token;
    const data = await graphqlClient.mutate(UPDATE_ADDRESS, { input }, token);
    return data.updateCustomerAddress;
  } catch (error) {
    console.error('Failed to update address:', error);
    throw error;
  }
}

async function deleteAddress(id) {
  try {
    const token = app.globalData.token;
    const data = await graphqlClient.mutate(DELETE_ADDRESS, { id }, token);
    return data.deleteCustomerAddress;
  } catch (error) {
    console.error('Failed to delete address:', error);
    throw error;
  }
}

module.exports = {
  getActiveCustomer,
  getCustomerAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
};