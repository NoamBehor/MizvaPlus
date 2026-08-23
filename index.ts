import 'react-native-reanimated';

import { registerRootComponent } from 'expo';

import { initializeRtl } from '@/utils/initializeRtl';

import App from './App';

initializeRtl();

registerRootComponent(App);
