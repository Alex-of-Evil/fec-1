import React, { useState, useEffect, useCallback } from 'react';
import RelatedItem from './RelatedItem';
import Compare from './Compare';

const fetch = require('node-fetch');

const RelatedList = ({ product }) => {
  const [related, setRelated] = useState([]);
  const [items, setItems] = useState([]);
  const [showCompare, setShowCompare] = useState(false);
  const [selectedItem, setSelectedItem] = useState();
  const [window, setWindow] = useState({});

  const getRelated = () => {
    if (product.id) {
      fetch(`http://localhost:3000/products/${product.id}/related`)
        .then((res) => res.json())
        .then((data) => setRelated(data))
        .catch((error) => console.log(error));
    }
  };

  const calculateRating = (obj) => {
    const total = Object.keys(obj.ratings).reduce((accumRating, curr) =>
    accumRating + parseInt(curr) * parseInt(obj.ratings[curr]), 0);
    const amount = Object.values(obj.ratings).reduce((accum, curr) => accum + parseInt(curr), 0);
    return (total / amount) || 0;
  };

  const getItems = async () => {
    if (related) {
      const result = related.map(async (eachId) => {
        let item = await fetch(`/products/${eachId}`);
        item = await item.json();
        let image = await fetch(`/products/${eachId}/styles`);
        image = await image.json();
        item.image = image.results[0].photos[0].url || null;
        let rating = await fetch(`/reviews/meta/?product_id=${eachId}`);
        rating = await rating.json();
        rating = calculateRating(rating);
        item.rating = {
          whole: Math.floor(rating),
          part: `${Math.round(((rating - Math.floor(rating)) * 4)) * 25}%`,
        };
        return item;
      });
      const resolved = await Promise.all(result);
      setItems(resolved);
    }
  };

  // const getWindow = () => {
  //   if (item.length === 0) {

  //   } else if ()
  //   resolved.length > 3 ? setWindow({start: 0, end: 3})
  //   : setWindow({start: 0, end: resolved.length});
  // };

  useEffect(() => {
    getRelated();
    // getWindow();
  }, [product.id]);

  useEffect(() => {
    getItems();
  }, [related]);

  const showCompareCH = (item) => {
    setShowCompare(true);
    setSelectedItem(item);
  };

  return (
    <div>
      <h3 className="title">RELATED PRODUCTS</h3>
      <div className="list">
      <button type="button">left</button>
        { items.map((each) => <RelatedItem item={each} showCompareCH={showCompareCH} />)}
      <button type="button">right</button>
      </div>
      {selectedItem && showCompare
        ? <Compare product={product} related={selectedItem} setShowCompare={setShowCompare} />
        : null}
    </div>
  );
};

export default RelatedList;