import { AppRegistry } from 'react-native';
import appJson from '../app.json';
import Main from './Main';

const appName = appJson.expo.name;

AppRegistry.registerComponent(appName, () => Main);
