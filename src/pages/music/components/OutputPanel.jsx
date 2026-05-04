/* OutputPanel — tabbed: Rooms & Groups · Spotify Connect.
 * Shares the bento-rooms tile so the user can flip between
 * Sonos grouping and Spotify Connect device transfer in place. */
import { useState, memo } from 'react';
import { RoomGroups } from './RoomGroups.jsx';
import { DevicePicker } from './DevicePicker.jsx';

export const OutputPanel = memo(function OutputPanel(props) {
  const [tab, setTab] = useState('rooms');
  return (
    <div className="output-panel">
      <div className="output-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={tab === 'rooms'}
          className={`library-tab ${tab === 'rooms' ? 'on' : ''}`}
          onClick={() => setTab('rooms')}
        >Rooms</button>
        <button
          role="tab"
          aria-selected={tab === 'devices'}
          className={`library-tab ${tab === 'devices' ? 'on' : ''}`}
          onClick={() => setTab('devices')}
        >Spotify Connect</button>
      </div>
      <div className="output-body">
        {tab === 'rooms' ? (
          <RoomGroups
            householdId={props.householdId}
            groups={props.groups}
            players={props.players}
            selectedGroupId={props.selectedGroupId}
            onSelect={props.onSelect}
            onSonos={props.onSonos}
            onRefresh={props.onRefresh}
            onPlayTrack={props.onPlayTrack}
          />
        ) : (
          <DevicePicker
            devices={props.devices}
            currentDeviceId={props.currentDeviceId}
            onTransfer={props.onTransfer}
          />
        )}
      </div>
    </div>
  );
});
