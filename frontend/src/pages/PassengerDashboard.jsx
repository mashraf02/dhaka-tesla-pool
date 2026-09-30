import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import * as ridesApi from '../api/rides';
import { AREAS } from '../constants/areas';
import StatusBadge from '../components/StatusBadge';
import { formatPoysha } from '../utils/money';

const ACTIVE_STATUSES = ['REQUESTED', 'MATCHED', 'DRIVER_ARRIVED', 'STARTED'];

export default function PassengerDashboard() {
  const { user, logout } = useAuth();
  const [rides, setRides] = useState(null);
  const [error, setError] = useState(null);
  const [pickupArea, setPickupArea] = useState(AREAS[0]);
  const [destinationArea, setDestinationArea] = useState(AREAS[1]);
  const [requesting, setRequesting] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);

  const loadRides = useCallback(async () => {
    try {
      const res = await ridesApi.listMyRides();
      setRides(res.data.rides);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load your rides');
    }
  }, []);

  useEffect(() => {
    loadRides();
    const interval = setInterval(loadRides, 4000);
    return () => clearInterval(interval);
  }, [loadRides]);

  async function handleRequestRide(e) {
    e.preventDefault();
    if (pickupArea === destinationArea) {
      setError('Pickup and destination must be different areas');
      return;
    }
    setError(null);
    setRequesting(true);
    try {
      await ridesApi.createRide({ pickupArea, destinationArea, seatsRequested: 1 });
      await loadRides();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not request a ride');
    } finally {
      setRequesting(false);
    }
  }

  async function handleCancel(rideId) {
    setCancellingId(rideId);
    setError(null);
    try {
      await ridesApi.cancelRide(rideId);
      await loadRides();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not cancel this ride');
    } finally {
      setCancellingId(null);
    }
  }

  const activeRide = rides?.find((r) => ACTIVE_STATUSES.includes(r.status));
  const pastRides = rides?.filter((r) => !ACTIVE_STATUSES.includes(r.status)) || [];

  return (
    <div className="dashboard">
      <header>
        <h1>Hi, {user.name}</h1>
        <button onClick={logout} className="secondary">Log out</button>
      </header>

      {error && <p className="error">{error}</p>}

      {!activeRide && (
        <section className="card">
          <h2>Request a ride</h2>
          <form onSubmit={handleRequestRide}>
            <label>
              Pickup
              <select value={pickupArea} onChange={(e) => setPickupArea(e.target.value)}>
                {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </label>
            <label>
              Destination
              <select value={destinationArea} onChange={(e) => setDestinationArea(e.target.value)}>
                {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </label>
            <button type="submit" disabled={requesting}>
              {requesting ? 'Requesting…' : 'Request ride'}
            </button>
          </form>
        </section>
      )}

      {activeRide && (
        <section className="card">
          <h2>Your active ride</h2>
          <p>{activeRide.pickupArea} → {activeRide.destinationArea}</p>
          <p><StatusBadge status={activeRide.status} /></p>
          <p>Fare: {formatPoysha(activeRide.estimatedFarePoysha)}
            {activeRide.status === 'REQUESTED' && ' (estimated — may drop if pooled)'}
          </p>
          {['REQUESTED', 'MATCHED', 'DRIVER_ARRIVED'].includes(activeRide.status) && (
            <button
              className="danger"
              onClick={() => handleCancel(activeRide.id)}
              disabled={cancellingId === activeRide.id}
            >
              {cancellingId === activeRide.id ? 'Cancelling…' : 'Cancel ride'}
            </button>
          )}
        </section>
      )}

      <section className="card">
        <h2>History</h2>
        {rides === null && <p>Loading…</p>}
        {rides !== null && pastRides.length === 0 && <p>No past rides yet.</p>}
        {pastRides.length > 0 && (
          <ul className="ride-history">
            {pastRides.map((r) => (
              <li key={r.id}>
                <span>{r.pickupArea} → {r.destinationArea}</span>
                <StatusBadge status={r.status} />
                <span>{formatPoysha(r.finalFarePoysha ?? r.estimatedFarePoysha)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
