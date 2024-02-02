require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const axios = require('axios');

const PORT = process.env.PORT || 3333;

app.use(cors());

app.get('/', (req, res) =>  res.send('Root!!'));


/******************************* SEARCH RESULTS *******************************/

const mapResults = (results, filters, available_filters) => {
  const categoriesArr = [];
  let categories = [];

  if (filters?.length) {
    categories = filters.find((filter) => {
      return filter.id === 'category'
    })?.values;
  } else {
    categories = available_filters?.find((filter) => {
      return filter.id === 'category'
    })?.values;
  };
  
  const items = results.map((result) => {
    const {
      id, 
      title, 
      price, 
      currency_id, 
      thumbnail, 
      condition, 
      shipping,
      category_id,
    } = result;

    const currentCategory = categories.find((category) => {
      return category.id === category_id
    });

    categoriesArr.push(currentCategory?.name || category_id);
    const amount = Math.floor(price);
    const decimals = (price - amount).toFixed(2).replace(/^0.+/, '');
    
    return {
      id,
      title,
      price: {
        currency: currency_id,
        amount,
        decimals: decimals === '' ? '00' : decimals
      },
      picture: thumbnail,
      condition,
      free_shipping: shipping?.free_shipping
    }
  })

  return {
    author: {
      name: 'Hermes',
      lastname: 'Echavarría'
    },
    categories: categoriesArr,
    items,
  }
};

app.get(`/sites/MLA/search`, (req, res) => {
  const {limit, q} = req?.query;
  axios(`${process.env.MELI_API_URL}/sites/MLA/search?limit=${limit}&q=${q}`)
    .then(({data}) => {
      const results = data?.results;
      const filters = data?.filters;
      const available_filters = data?.available_filters;

      const mappedRes = mapResults(results, filters, available_filters);

      res.send(mappedRes);
    })
    .catch((err) => {
      console.error('Ocurrió un error obteniendo los productos:', err);
      res.status(500).send({ error: 'Internal Server Error' });
    })
});


/******************************* PRODUCT DETAIL *******************************/

const mapProductRes = (productRes, res) => {
  const {
    id, 
    title, 
    price, 
    currency_id, 
    thumbnail, 
    pictures,
    condition, 
    shipping,
    initial_quantity,
    available_quantity,
    category_id
  } = productRes;
  
  const amount = Math.floor(price);
  const decimals = (price - amount).toFixed(2).replace(/^0.+/, '');

  const mappedProduct = {
    author: {
      name: 'Hermes',
      lastname: 'Echavarría'
    },
    item: {
      id,
      title,
      price: {
        currency: currency_id,
        amount,
        decimals: decimals === '' ? '00' : decimals
      },
      picture: pictures?.length && pictures[0].secure_url || thumbnail,
      condition,
      free_shipping: shipping?.free_shipping,
      sold_quantity: (initial_quantity - available_quantity) || 0,
      description: '',
      category: category_id
    }
  };

  const getDescription = (mappedProduct) => {
    return axios(`${process.env.MELI_API_URL}/items/${id}/description`)
      .then(({data}) => {
        if (mappedProduct?.item) {
          mappedProduct.item.description = data.plain_text;
        };

        return mappedProduct;
      })
      .catch((err) => {
        console.error('Ocurrió un error obteniendo el detalle:', err);
        res.status(500).send({ error: 'Internal Server Error' });
      })
  }

  getDescription(mappedProduct)
    .then((finalProduct) => {
      res.send(finalProduct);
    })
    .catch((error) => {
      console.error('Error al obtener la descripción del producto:', error);
      res.status(500).send({ error: 'Internal Server Error' });
    });
};

app.get(`/items/:id`, (req, res) => {
  const { id } = req.params;
  
  axios(`${process.env.MELI_API_URL}/items/${id}`)
    .then(({data}) => mapProductRes(data, res))
    .catch((err) => {
      console.error('Ocurrió un error obteniendo el producto:', err);
      res.status(500).send({ error: 'Internal Server Error' });
    })
});


app.listen(PORT, () => {
  console.log(`Server running on: http://localhost:${PORT}`);
});