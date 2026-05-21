const app = getApp();
const { graphqlClient } = require('../../../utils/api.js');

const GET_COLLECTIONS = `
  query GetCollections {
    collections {
      items {
        id
        name
        slug
        description
        productCount
        parent {
          id
          name
        }
        children {
          id
          name
          slug
          productCount
          featuredAsset {
            id
            preview
          }
        }
        featuredAsset {
          id
          preview
        }
      }
    }
  }
`;

const GET_COLLECTION = `
  query GetCollection($slug: String!, $options: ProductVariantListOptions) {
    collection(slug: $slug) {
      id
      name
      slug
      description
      featuredAsset {
        id
        preview
      }
      productVariants(options: $options) {
        totalItems
        items {
          id
          name
          priceWithTax
          currencyCode
          sku
          stockLevel
          featuredAsset {
            id
            preview
          }
          product {
            id
            name
            slug
            featuredAsset {
              id
              preview
            }
          }
        }
      }
    }
  }
`;

const GET_PRODUCTS = `
  query GetProducts($options: ProductVariantListOptions) {
    productVariants(options: $options) {
      totalItems
      items {
        id
        name
        slug
        priceWithTax
        currencyCode
        sku
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
`;

const GET_PRODUCT = `
  query GetProduct($slug: String!) {
    product(slug: $slug) {
      id
      name
      slug
      description
      sku
      featuredAsset {
        id
        preview
      }
      assets {
        id
        preview
      }
      optionGroups {
        id
        code
        name
        options {
          id
          code
          name
        }
      }
      variants {
        id
        name
        sku
        priceWithTax
        currencyCode
        stockLevel
        price
        priceWithoutTax
        featuredAsset {
          id
          preview
        }
      }
      facetValues {
        id
        code
        name
        facet {
          id
          code
          name
        }
      }
    }
  }
`;

const SEARCH_PRODUCTS = `
  query SearchProducts($term: String!, $page: Int, $pageSize: Int) {
    searchVariantsWithOptions(
      term: $term
      page: $page
      pageSize: $pageSize
    ) {
      totalCount
      items {
        variantId
        sku
        variantName
        price
        priceWithTax
        productId
        productName
        slug
        description
        productAsset {
          id
          preview
        }
        variantFacets {
          id
          name
          code
        }
        options {
          id
          name
        }
      }
    }
  }
`;

async function getCollections() {
  try {
    const data = await graphqlClient.query(GET_COLLECTIONS);
    return data.collections && data.collections.items || [];
  } catch (error) {
    console.error('Failed to fetch collections:', error);
    return [];
  }
}

async function getCollection(slug, page = 1, pageSize = 20) {
  try {
    console.log('Fetching collection with slug:', slug);
    const options = {
      skip: (page - 1) * pageSize,
      take: pageSize
    };
    const data = await graphqlClient.query(GET_COLLECTION, { slug, options });
    console.log('Collection data:', data);
    return data.collection;
  } catch (error) {
    console.error('Failed to fetch collection:', error);
    return null;
  }
}

async function getProducts(options = {}) {
  try {
    const defaultOptions = {
      take: 20,
      skip: 0,
      sort: {
        name: 'ASC',
      },
    };

    const mergedOptions = { ...defaultOptions, ...options };
    const data = await graphqlClient.query(GET_PRODUCTS, { options: mergedOptions });

    return {
      items: data.productVariants && data.productVariants.items || [],
      totalItems: data.productVariants && data.productVariants.totalItems || 0,
    };
  } catch (error) {
    console.error('Failed to fetch products:', error);
    return { items: [], totalItems: 0 };
  }
}

async function getProduct(slug) {
  try {
    const data = await graphqlClient.query(GET_PRODUCT, { slug });
    return data.product;
  } catch (error) {
    console.error('Failed to fetch product:', error);
    return null;
  }
}

async function searchProducts(keyword, options = {}) {
  try {
    const variables = {
      term: keyword,
      page: options.page || 1,
      pageSize: options.pageSize || 20,
    };
    console.log('🔍 searchProducts query:', JSON.stringify(variables));
    
    const data = await graphqlClient.query(SEARCH_PRODUCTS, variables);
    
    // console.log('🔍 searchProducts response:', JSON.stringify(data));

    return {
      items: data.searchVariantsWithOptions && data.searchVariantsWithOptions.items || [],
      totalItems: data.searchVariantsWithOptions && data.searchVariantsWithOptions.totalCount || 0,
    };
  } catch (error) {
    console.error('Failed to search products:', error);
    return { items: [], totalItems: 0 };
  }
}

module.exports = {
  getCollections,
  getCollection,
  getProducts,
  getProduct,
  searchProducts,
};