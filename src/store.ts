import { makeAutoObservable } from 'mobx';
export { observer } from 'mobx-react-lite';

class Store {
	constructor() {
		makeAutoObservable(this);
	}
}
export default new Store();