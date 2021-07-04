import React, { useState, useEffect } from 'react';
import Related from './components/related/Related/RelatedList';
import Inventory from './components/related/Inventory/InventoryList';
import QAndA from './components/qanda/QAndA';
import ReviewComponents from './components/ratingsreviews/reviews/ReviewComponents';
import Overview from './components/overview/Overview';
import Announcement from './components/annoucements/Announcements';
import Header from './components/header/Header';

function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.log(error);
      return initialValue;
    }
  });
  const setValue = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.log(error);
    }
  };
  return [storedValue, setValue];
}

function App() {
  const [id, setId] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState();
  const [favorites, setFavorites] = useLocalStorage('favorites', []);
  const [reviews, setReviews] = useState([]);
  const [reviewMeta, setReviewMeta] = useState({});
  const [isLoaded, setIsLoaded] = useState(false);
  const [theme, setTheme] = useState(true);
  const [related, setRelated] = useState([]);
  const [questionsArray, setQuestionArray] = useState([]);

  const PRODUCTS_API = 'http://3.138.137.215';
  const REVIEWS_API = 'http://34.217.78.107';
  const QANDA_API = 'http://3.15.4.220';

  async function getProduct() {
    let product = await fetch(`${PRODUCTS_API}/products/${id}`);
    product = await product.json();
    const thisProduct = {
      id: product.id,
      category: product.category,
      default_price: product.default_price,
      description: product.description,
      name: product.name,
      slogan: product.slogan,
      features: product.features,
      starRating: null,
      totalNumReviews: null,
      styleThumbnail: [],
      styleList: [],
    };
    return thisProduct;
  }

  const assignIsFav = (style) => {
    favorites.forEach((each) => {
      if (each.id === id && each.style.id === style.id) {
        style.isFavorite = true;
      }
    });
  };

  async function getStyles() {
    let response = await fetch(`${PRODUCTS_API}/products/${id}/styles`);
    response = await response.json();
    const styles = [];
    response.results.forEach(async (style) => {
      const thisStyle = {
        id: style.style_id,
        name: style.name,
        original_price: style.original_price,
        sale_price: style.sale_price,
        photos: style.photos,
        skus: style.skus,
        lastViewedIndex: 0,
      };
      await Promise.all([thisStyle])
        .then(assignIsFav(thisStyle))
        .then(styles.push(thisStyle));
    });
    return styles;
  }

  const getReviews = async () => {
    let response = await fetch(`${REVIEWS_API}/reviews?product_id=${id}&sort=relevant&count=1000`);
    response = await response.json();
    return response.results;
  };

  const calculateRating = (obj, fetchProduct) => {
    const total = Object.keys(obj.ratings).reduce((accumRating, curr) => accumRating + parseInt(curr) * parseInt(obj.ratings[curr]), 0);
    const amount = Object.values(obj.ratings).reduce((accum, curr) => accum + parseInt(curr), 0);
    if (fetchProduct) {
      fetchProduct.totalNumReviews = amount;
    }
    return (total / amount) || 0;
  };

  const displayItemCH = (num) => {
    if (num !== id) {
      setIsLoaded(false);
      setId(num);
    }
  };

  const getRatings = async (fetchProduct) => {
    let rating = await fetch(`${REVIEWS_API}/reviews/meta?product_id=${id}`);
    rating = await rating.json();
    setReviewMeta(rating);
    rating = calculateRating(rating, fetchProduct);
    fetchProduct.starRating = {
      whole: Math.floor(rating),
      part: `${Math.round(((rating - Math.floor(rating)) * 4)) * 25}%`,
    };
  };

  const getRelatedStyles = async (item, id) => {
    let style = await fetch(`${PRODUCTS_API}/products/${id}/styles`);
    style = await style.json();
    item.sale = style.results[0].sale_price;
    item.image = style.results[0].photos[0].url || null;
  };

  const getRelatedRating = async (item, id) => {
    let rating = await fetch(`${REVIEWS_API}/reviews/meta/?product_id=${id}`);
    rating = await rating.json();
    rating = calculateRating(rating);
    item.rating = {
      whole: Math.floor(rating),
      part: `${Math.round(((rating - Math.floor(rating)) * 4)) * 25}%`,
    };
  };

  const getRelated = async () => {
    let response = await fetch(`${PRODUCTS_API}/products/${id}/related`);
    response = await response.json();
    const result = response.map(async (eachId, index) => {
      let item = await fetch(`${PRODUCTS_API}/products/${eachId}`);
      item = await item.json();
      item.index = index;
      const styles = getRelatedStyles(item, eachId);
      const rating = getRelatedRating(item, eachId);
      await Promise.all([styles, rating]);
      return item;
    });
    const resolved = await Promise.all(result);
    setRelated(resolved);
  };

  const getQuestions = async () => {
    let results = await fetch(`${QANDA_API}/qa/questions?product_id=${id}&count=100`);
    results = await results.json();
    // return results;
    setQuestionArray(results.results);
  };

  const hasFavConflict = (obj) => {
    for (let i = 0; i < favorites.length; i++) {
      if (favorites[i].id === obj.id && favorites[i].style.id === obj.style.id) {
        return true;
      }
    }
    return false;
  };

  function favoriteCH(product, style) {
    const temp = { ...product };
    temp.style = style;
    if (!hasFavConflict(temp)) {
      temp.style.isFavorite = true;
      setFavorites([...favorites, temp]);
    }
  }

  const deleteFavoriteCH = (item, style) => {
    const theStyle = item.style || style;
    theStyle.isFavorite = false;
    const copy = favorites.slice();
    for (let i = 0; i < copy.length; i++) {
      if (copy[i].style.id === theStyle.id && copy[i].id === item.id) {
        copy.splice(i, 1);
        break;
      }
    }
    setFavorites(copy);
  };

  async function cartCH(sku, quantity) {
    const skuInt = parseInt(sku.value, 10);
    const data = {
      sku_id: skuInt,
    };
    const respArray = [];
    for (let i = 0; i < quantity; i += 1) {
      const response = fetch('/cart', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      respArray.push(response);
    }
    Promise.all(respArray)
      .catch((err) => console.log(err));
  }

  const toggleColors = () => {
    const root = document.documentElement;

    if (theme) {
      root.style.setProperty('background-color', 'black');
      root.style.setProperty('color', 'white');
      setTheme(false);
    } else {
      root.style.setProperty('background-color', 'white');
      root.style.setProperty('color', 'black');
      setTheme(true);
    }
  };

  useEffect(() => {
    async function initialize() {
      const fetchProduct = await getProduct();
      const fetchStyles = getStyles(fetchProduct);
      const fetchReviews = getReviews(fetchProduct);
      const fetchRatings = getRatings(fetchProduct);
      const fetchRelated = getRelated();
      const fetchQuestions = getQuestions();
      Promise.all([fetchStyles, fetchReviews, fetchRatings, fetchRelated, fetchQuestions])
        .then(([fetchedStyles, fetchedReviews, fetchedRatings, fetchedQuestions]) => {
          fetchProduct.styleList = fetchedStyles;
          setSelectedProduct(fetchProduct);
          setReviews(fetchedReviews);
          setIsLoaded(true);
        });
    }
    initialize();
  }, [id]);

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  const toggle = <button type="button" id="toggle-theme" onClick={toggleColors}>toggle</button>;

  return (
    <div id="app-inner">
      <Header />
      <Announcement />
      <Overview
        product={selectedProduct}
        favoriteCH={favoriteCH}
        cartCH={cartCH}
        deleteFavoriteCH={deleteFavoriteCH}
      />
      <Related
        related={related}
        product={selectedProduct}
        displayItemCH={displayItemCH}
        theme={theme}
      />
      <Inventory
        favorites={favorites}
        deleteFavoriteCH={deleteFavoriteCH}
        displayItemCH={displayItemCH}
        theme={theme}
      />
      <QAndA
        product={selectedProduct}
        theme={theme}
        id={id}
        questionsArray={questionsArray}
        getQuestions={getQuestions}
      />
      <ReviewComponents
        product={selectedProduct}
        reviews={reviews}
        reviewMeta={reviewMeta}
        theme={theme}
      />
      <div>
        {toggle}
      </div>
    </div>
  );
}

export default App;
