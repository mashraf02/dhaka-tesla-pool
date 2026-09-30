import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import * as driverApi from '../api/driver';
import StatusBadge from '../components/StatusBadge';
import { formatPoysha } from '../utils/money';

const NEXT_STAGE = { MATCHED: 'arrived', DRIVER_ARRIVED: 'start', STARTED: 'complete' };
const NEXT_LABEL = { MATCHED: 'Mark arrived', DRIVER_ARRIVED: 'Start trip', STARTED: 'Complete trip' };

export default function DriverDashboard() {
  const { user, logout } = useAuth();
  const [vehicle, setVehicle] = useState(undefined); // undefined = loading, null = none yet
  const [requests, setRequests] = useState([]);
  const [pool, setPool] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const [label, setLabel] = useState('Bullet');
  const [capacity, setCapacity] = useState(3);

  const load = useCallback(async () => {
    try {
      const vRes = await driverApi.listVehicles();
      const myVehicle = vRes.data.vehicles[0] || null;
      setVehicle(myVehicle);

      if (myVehicle?.isOnline) {
        const rRes = await driverApi.listRequests();
        setRequests(rRes.data.requests);
      } else {
        setRequests([]);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load dashboard');
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 4000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    if (!pool) return;
    const interval = setInterval(async () => {
      try {
        const res = await driverApi.getPool(pool.id);
        setPool(res.data.pool);
      } catch {
        // pool may have completed; leave stale briefly, next load() cycle recovers
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [pool]);

  async function handleCreateVehicle(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await driverApi.createVehicle({ label, capacity: Number(capacity) });
      setVehicle(res.data.vehicle);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not register vehicle');
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleOnline() {
    setError(null);
    setBusy(true);
    try {
      const res = await driverApi.setVehicleOnline(vehicle.id, !vehicle.isOnline);
      setVehicle(res.data.vehicle);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not update vehicle status');
    } finally {
      setBusy(false);
    }
  }

  async function handleAccept(rideId) {
    setError(null);
    setBusy(true);
    try {
      const res = await driverApi.acceptRide(vehicle.id, rideId, pool?.id);
      setPool(res.data.pool);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not accept this ride');
    } finally {
      setBusy(false);
    }
  }

  async function handleAdvance() {
    setError(null);
    setBusy(true);
    try {
      const stage = NEXT_STAGE[pool.status];
      const res = await driverApi.advancePool(pool.id, stage);
      if (res.data.pool.status === 'COMPLETED') {
        setPool(null);
        await load();
      } else {
        setPool(res.data.pool);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Could not advance the trip');
    } finally {
      setBusy(false);
    }
  }

  if (vehicle === undefined) {
    return <div className="dashboard"><p>Loading…</p></div>;
  }

  return (
    <div className="dashboard">
      <header>
        <h1>Hi, {user.name}</h1>
        <button onClick={logout} className="secondary">Log out</button>
      </header>

      {error && <p className="error">{error}</p>}

      {vehicle === null && (
        <section className="card">
          <h2>Register your Tesla</h2>
          <form onSubmit={handleCreateVehicle}>
            <label>
              Label
              <input value={label} onChange={(e) => setLabel(e.target.value)} required />
            </label>
            <label>
              Seats
              <input type="number" min={1} max={4} value={capacity} onChange={(e) => setCapacity(e.target.value)} required />
            </label>
            <button type="submit" disabled={busy}>{busy ? 'Registering…' : 'Register vehicle'}</button>
          </form>
        </section>
      )}

      {vehicle && (
        <section className="card">
          <h2>{vehicle.label} ({vehicle.capacity} seats)</h2>
          <p>Status: {vehicle.isOnline ? 'Online' : 'Offline'}</p>
          <button onClick={handleToggleOnline} disabled={busy || Boolean(pool)}>
            {vehicle.isOnline ? 'Go offline' : 'Go online'}
          </button>
        </section>
      )}

      {pool && (
        <section className="card">
          <h2>Current pool</h2>
          <p><StatusBadge status={pool.status} /> — {pool.seatsUsed}/{vehicle.capacity} seats</p>
          {NEXT_STAGE[pool.status] && (
            <button onClick={handleAdvance} disabled={busy}>
              {busy ? 'Updating…' : NEXT_LABEL[pool.status]}
            </button>
          )}
        </section>
      )}

      {vehicle?.isOnline && (
        <section className="card">
          <h2>Nearby requests</h2>
          {requests.length === 0 && <p>No pending requests right now.</p>}
          {requests.length > 0 && (
            <ul className="ride-history">
              {requests.map((r) => (
                <li key={r.id}>
                  <span>{r.pickupArea} → {r.destinationArea}</span>
                  <span>{formatPoysha(r.estimatedFarePoysha)}</span>
                  <button onClick={() => handleAccept(r.id)} disabled={busy}>
                    {pool ? 'Add to pool' : 'Accept'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
