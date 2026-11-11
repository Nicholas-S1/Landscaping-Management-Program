import React, { useState } from 'react';
import TimeClock from '../components/TimeClock/TimeClock';
import { errorMessage, getData, listItems, putData } from '../services/resource';
import {
  Badge, Empty, Loading, Modal, Notice, PageHeader, fmtClock, fmtTime, mapsRouteUrl, mapsSearchUrl, personName, useLoad, ymd
} from '../components/ui';
import JobCard from './JobCard';
import { NotesFeed } from './PropertyPages';

const TodayPage: React.FC = () => {
  const today = useLoad(() => getData('/routes/today/my-route'), []);
  const jobs = useLoad(() => listItems('/jobs', { mine: true, date: ymd() }), []);
  const [notesFor, setNotesFor] = useState<any | null>(null);
  const [error, setError] = useState('');

  const route = today.data?.route;
  const truck = today.data?.truck;
  const stops: any[] = route?.customers || [];
  const mapUrl = mapsRouteUrl(stops.map((stop) => stop.customer.propertyAddress));

  const setStopStatus = async (stop: any, status: string) => {
    setError('');
    try {
      await putData(`/routes/${route.id}/customers/${stop.customerId}`, { status });
      today.reload();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <div>
      <PageHeader title="Today" subtitle={new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })} />
      <Notice kind="error">{error || today.error || jobs.error}</Notice>

      <div className="grid">
        <TimeClock />
        <div className="card">
          <h2>My truck</h2>
          {today.loading && !today.data ? (
            <Loading />
          ) : truck ? (
            <>
              <p>
                <strong>{truck.name}</strong>
                {truck.licensePlate && <span className="muted"> · {truck.licensePlate}</span>}
              </p>
              <p className="muted small">
                {[truck.year, truck.make, truck.model].filter(Boolean).join(' ')}
                {today.data?.truckRole && ` · You are the ${today.data.truckRole}`}
              </p>
            </>
          ) : (
            <Empty>You have not been assigned to a truck today.</Empty>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <div className="card-head">
          <h2>
            {route ? `Route: ${route.name}` : "Today's route"}
            {route?.startTime && <span className="muted"> · starts {fmtTime(route.startTime)}</span>}
          </h2>
          {mapUrl && (
            <a className="button button-secondary" href={mapUrl} target="_blank" rel="noreferrer">
              Open route in Google Maps
            </a>
          )}
        </div>
        {today.loading && !today.data ? (
          <Loading />
        ) : stops.length === 0 ? (
          <Empty>{route ? 'This route has no stops yet.' : 'No route is scheduled for your truck today.'}</Empty>
        ) : (
          <ul className="list">
            {stops.map((stop, index) => (
              <li key={stop.id} className="stop">
                <div className="stop-number">{index + 1}</div>
                <div className="stop-body">
                  <div className="spread">
                    <div>
                      <strong>{personName(stop.customer)}</strong>
                      {stop.customer.phone && <span className="muted"> · {stop.customer.phone}</span>}
                      <div>
                        {stop.customer.propertyAddress ? (
                          <a href={mapsSearchUrl(stop.customer.propertyAddress)} target="_blank" rel="noreferrer">
                            {stop.customer.propertyAddress}
                          </a>
                        ) : (
                          <span className="muted">No address on file</span>
                        )}
                      </div>
                    </div>
                    <Badge value={stop.status} />
                  </div>
                  {stop.customer.propertyNotes && <div className="callout">{stop.customer.propertyNotes}</div>}
                  {stop.actualArrival && (
                    <div className="muted small" style={{ marginTop: 4 }}>
                      Arrived {fmtClock(stop.actualArrival)}
                      {stop.actualDeparture && ` · Left ${fmtClock(stop.actualDeparture)}`}
                    </div>
                  )}
                  <div className="row" style={{ marginTop: 8 }}>
                    {stop.status === 'pending' && (
                      <button className="button button-small" onClick={() => setStopStatus(stop, 'in_progress')}>
                        Arrived
                      </button>
                    )}
                    {stop.status === 'in_progress' && (
                      <button className="button button-small" onClick={() => setStopStatus(stop, 'completed')}>
                        Finished
                      </button>
                    )}
                    {stop.status === 'pending' && (
                      <button className="button button-secondary button-small" onClick={() => setStopStatus(stop, 'skipped')}>
                        Skip
                      </button>
                    )}
                    <button className="button button-secondary button-small" onClick={() => setNotesFor(stop.customer)}>
                      Notes and photos
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <h2 style={{ margin: '4px 0 12px' }}>My jobs today</h2>
      {jobs.loading && !jobs.data ? (
        <Loading />
      ) : jobs.data && jobs.data.length > 0 ? (
        jobs.data.map((job) => <JobCard key={job.id} job={job} onChange={jobs.reload} />)
      ) : (
        <div className="card">
          <Empty>No jobs are assigned to you today.</Empty>
        </div>
      )}

      {notesFor && (
        <Modal title={`Property notes: ${personName(notesFor)}`} onClose={() => setNotesFor(null)} wide>
          <NotesFeed customerId={notesFor.id} staff />
        </Modal>
      )}
    </div>
  );
};

export default TodayPage;
