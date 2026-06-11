import { useEffect, useState } from 'react';
import { apiFetch } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

const emptyOrder = {
  symbol: 'AAPL',
  quantity: 1,
  side: 'buy',
  orderType: 'market',
  assetType: 'stock',
  limitPrice: '',
  stopPrice: ''
};

export function OrdersPage() {
  const { token } = useAuth();
  const [formState, setFormState] = useState(emptyOrder);
  const [orders, setOrders] = useState([]);
  const [message, setMessage] = useState('');

  async function refreshOrders() {
    const data = await apiFetch('/orders', { token });
    setOrders(data.orders || []);
  }

  useEffect(() => {
    refreshOrders().catch(() => null);
  }, [token]);

  async function submitOrder(event) {
    event.preventDefault();
    setMessage('');

    const payload = {
      ...formState,
      quantity: Number(formState.quantity),
      limitPrice: formState.limitPrice || undefined,
      stopPrice: formState.stopPrice || undefined
    };

    const data = await apiFetch('/orders', {
      token,
      method: 'POST',
      body: JSON.stringify(payload)
    });

    setMessage(data.status === 'filled' ? 'Market order filled immediately.' : 'Order placed and waiting to trigger.');
    setFormState(emptyOrder);
    await refreshOrders();
  }

  return (
    <div className="page-stack">
      <section className="panel">
        <h1>Trade Ticket</h1>
        <form className="trade-form" onSubmit={submitOrder}>
          <input value={formState.symbol} onChange={(event) => setFormState((current) => ({ ...current, symbol: event.target.value.toUpperCase() }))} placeholder="Symbol" />
          <input type="number" min="1" value={formState.quantity} onChange={(event) => setFormState((current) => ({ ...current, quantity: event.target.value }))} placeholder="Quantity" />
          <select value={formState.side} onChange={(event) => setFormState((current) => ({ ...current, side: event.target.value }))}>
            <option value="buy">Buy</option>
            <option value="sell">Sell</option>
          </select>
          <select value={formState.orderType} onChange={(event) => setFormState((current) => ({ ...current, orderType: event.target.value }))}>
            <option value="market">Market</option>
            <option value="limit">Limit</option>
            <option value="stop">Stop</option>
          </select>
          <select value={formState.assetType} onChange={(event) => setFormState((current) => ({ ...current, assetType: event.target.value }))}>
            <option value="stock">Stock</option>
            <option value="option">Option</option>
          </select>
          <input value={formState.limitPrice} onChange={(event) => setFormState((current) => ({ ...current, limitPrice: event.target.value }))} placeholder="Limit price" />
          <input value={formState.stopPrice} onChange={(event) => setFormState((current) => ({ ...current, stopPrice: event.target.value }))} placeholder="Stop price" />
          <button className="primary-button" type="submit">Place order</button>
        </form>
        {message && <div className="info-banner">{message}</div>}
      </section>

      <section className="panel">
        <h2>Recent orders</h2>
        <div className="table-list">
          {orders.map((order) => (
            <div key={order._id} className="table-row">
              <span>{order.symbol}</span>
              <span>{order.side}</span>
              <span>{order.orderType}</span>
              <span>{order.quantity}</span>
              <span>{order.status}</span>
              <span>{order.filledPrice ? `$${Number(order.filledPrice).toFixed(2)}` : '—'}</span>
            </div>
          ))}
          {!orders.length && <p className="muted">No orders yet.</p>}
        </div>
      </section>
    </div>
  );
}