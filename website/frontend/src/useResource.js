import {useSyncExternalStore} from 'react';
export const useResource=resource=>useSyncExternalStore(resource.subscribe,resource.getSnapshot,resource.getSnapshot);
