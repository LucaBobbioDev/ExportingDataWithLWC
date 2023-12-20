import { LightningElement, track, api } from 'lwc';

import getRecords from '@salesforce/apex/Lookup.getRecords';

export default class Lookup extends LightningElement {
	@api targetObject;

	@api searchFieldList = [];
	@api moreFieldList = [];
	@api whereFieldList;
	@api whereFieldValueList;
	@api operatorList;
	@api orderByFieldList;

	@api newRecordLabel = 'Create new record';
	@api newRecordButton = false;
	@api noRepeats = 'Id';
	@api required = false;
	@api disabled = false;

	@api objectIconName = 'standard:custom_notification';
	@api inputLabel = '';
	@api placeholder = 'Write to search...';
	@api noRecordFoundLabel = 'No records found';

	@api textOptions = {
		title: 'Id',
		description: null
	};

	@api standardFormLayout = false;
	@api recordTypeId;

	@track allFieldList = [];
	@track searchValue = null;

	@track _recordId = null;
	@track recordList = null;
	@track selectedRecord = null;
	@track delayTimer;
	@track onBlurDelayTimer;

	isLoading = true;
	isEmptyRecordList = false;
	showCreateRecordForm = false;

	@api get recordId() {
		return this._recordId;
	}
	set recordId(value) {
		let oldRecordId = this._recordId;
		this._recordId = value;

		if (this.searchFieldList && this.searchFieldList.length > 0) {
			if (value && oldRecordId != value) {
				this.isLoading = true;
				this.getRecordsWithRecordId();
			}
			else if (!value && oldRecordId) {
				this.handleClearSelected();
			}
		}
	}

	get records() {
		if (!this.recordList || this.disabled) {
			return null;
		}
		else if (this.recordList.length === 0) {
			return [];
		}

		let recordList = this.recordList.map(record => {
			let title = this.getStringByRecord(record, this.textOptions.title);
			let description = null;
			let descriptionOptions = this.textOptions.description;

			if (descriptionOptions) {
				if (typeof descriptionOptions === 'string') {
					description = this.getStringByRecord(record, descriptionOptions) || null;
				}
				else if (descriptionOptions.length > 0) {
					description = this.fillDescription(descriptionOptions, record);
				}
			}

			return {
				Id: record.Id,
				title,
				description
			}
		});

		return recordList;
	}


	connectedCallback() {
		// console.log('Connected Callback =>', this.recordId);

		let fieldList = [];
		this.allFieldList = [...this.searchFieldList, ...this.moreFieldList].filter(
			item => {
				return typeof item === 'string' ? (
					!fieldList.includes(item) ? fieldList.push(item) : false
				) : false;
			}
		);

		if (!this.recordId) {
			this.selectedRecord = null;
			this.isLoading = false;
		}
		else {
			this.getRecordsWithRecordId();
		}
	}

	getRecordsWithRecordId() {
		let requestData = this.fillRequest(this.recordId);
		// console.log('Request Data =>', JSON.parse(JSON.stringify(requestData)));

		getRecords({ requestData: requestData })
			.then(resolve => {
				// console.log('resolve =>', resolve);
				this.handlerRecord(resolve);
			})
			.catch(error => {
				console.log('Error Lookup =>', error);
			})
			.finally(() => {
				this.isLoading = false;
			});
	}

	handlerRecord(data) {
		if (data && data.length > 0) {
			let dataList = this.checkNoRepeats(data);

			if (dataList && dataList.length > 0) {
				this.recordList = this.checkEmptyFields(dataList);

				if (this.recordList && this.recordList.length > 0) {
					this.fillSelectedRecord(this.recordId);
					this.isEmptyRecordList = false;
					return;
				}
			}
		}

		this.recordList = [];
		this.isEmptyRecordList = true;
	}

	handleTyping(event) {
		const { value } = event.target;

		this.recordList = null;

		clearTimeout(this.delayTimer);
		this.delayTimer = setTimeout(() => {
			this.isLoading = true;

			this.searchValue = value;

			this.handleGetRecords();
		}, 1000);
	}

	async handleGetRecords() {
		let requestData = this.fillRequest();
		// console.log('Request Data =>', JSON.parse(JSON.stringify(requestData)));

		const data = await getRecords({ requestData: requestData });
		// console.log('Data Lookup =>', JSON.parse(JSON.stringify(data)));

		let dataList = [];
		if (data && data.length > 0) {
			dataList = this.checkNoRepeats(data);

			if (dataList && dataList.length > 0) {
				this.recordList = this.checkEmptyFields(dataList);
				this.isEmptyRecordList = false;
				this.isLoading = false;

				return;
			}
		}

		this.recordList = [];
		this.isEmptyRecordList = true;
		this.isLoading = false;
	}

	handleSelectRecord(event) {
		const { value } = event.target.dataset;
		this.fillSelectedRecord(value);
	}

	handleSuccessCreate(event) {
		this.isLoading = true;

		const { id } = event.detail;

		this.recordId = id;

		this.handleToggleCreateRecord();

		this.isLoading = false;
	}

	handleToggleCreateRecord() {
		this.showCreateRecordForm = !this.showCreateRecordForm;
	}

	handleOnFocus() {
		if (!this.recordList) {
			this.handleGetRecords();
		}
	}

	handleCloseList() {
		this.recordList = null;
	}

	@api handleClearSelected() {
		this.clearAll();

		this.dispatchEvent(
			new CustomEvent('clearselectedrecord')
		);
	}

	@api clearAll() {
		this._recordId = null;
		this.recordId = null;
		this.selectedRecord = null;
		this.recordList = null;
		this.searchValue = null;
	}

	fillDescription(descriptionOptions, record) {
		let descriptionValues = [];

		descriptionOptions.forEach(field => {
			let fieldValue = this.getStringByRecord(record, field);

			if (fieldValue) {
				descriptionValues.push(
					typeof fieldValue === 'number' ? fieldValue.toFixed(2) :
					(
						!this.checkDatetimeAndDate(fieldValue) ?
							fieldValue :
							this.convertDatetimeAndDateToString(fieldValue)
					)
				);
			}
		});

		return descriptionValues.join(' | ');
	}

	fillSelectedRecord(recordId) {
		let record = this.recordList.find(item => item.Id === recordId);

		if (record) {
			let title = this.getStringByRecord(record, this.textOptions.title);

			this.selectedRecord = {
				Id: record.Id,
				title: title
			};

			this._recordId = record.Id;
			this.recordId = record.Id;

			this.dispatchEvent(
				new CustomEvent('selectrecord', {
					detail: {
						record
					}
				})
			);
		}
	}

	fillRequest(recordId) {
		let requestData = {
			recordId: recordId || '',
			targetObject: this.targetObject,
			searchValue: this.searchValue,
			searchFieldList: this.searchFieldList,
			moreFieldList: this.moreFieldList.length !== 0 ? this.moreFieldList : null
		};

		if (!recordId) {
			// console.log('whereFieldList =>', this.whereFieldList ? JSON.parse(JSON.stringify(this.whereFieldList)) : null);
			// console.log('whereFieldValueList =>', this.whereFieldValueList ? JSON.parse(JSON.stringify(this.whereFieldValueList)) : null);
			// console.log('operatorList =>', this.operatorList ? JSON.parse(JSON.stringify(this.operatorList)) : null);
			// console.log('orderByFieldList =>', this.orderByFieldList ? JSON.parse(JSON.stringify(this.orderByFieldList)) : null);

			if (this.whereFieldList && this.whereFieldValueList && this.operatorList) {
				let conditionList = this.fillConditionFields();

				requestData = {
					...requestData,
					conditionList: conditionList
				}
			}
			if (this.orderByFieldList) {
				requestData = {
					...requestData,
					orderByFieldList: this.orderByFieldList
				}
			}
		}

		return requestData;
	}

	fillConditionFields() {
		let conditionList = [];

		for (let i = 0; i < this.whereFieldList.length; i++) {
			const where = this.whereFieldList[i];
			const value = this.whereFieldValueList[i];
			const operator = this.operatorList[i];

			conditionList = [
				...conditionList,
				{
					whereField: where,
					whereValue: Array.isArray(value) ? null : value,
					operator: operator,
					whereValueList: Array.isArray(value) ? value : null,
				}
			];
		}
		// console.log('conditionList =>', JSON.parse(JSON.stringify(conditionList)));

		return conditionList;
	}

	checkEmptyFields(dataList) {
		return dataList.map(item => {
			let record = { ...item };

			this.allFieldList.forEach(field => {
				if (!record[field]) {
					record = {
						...record,
						[field]: item[field] || null
					};
				}
			});

			return record;
		});
	}

	checkNoRepeats(dataList) {
		let newDataList = [];

		dataList.forEach(item => {
			if (this.noRepeats == 'Id') {
				newDataList = [
					...newDataList,
					item
				];
			}
			else {
				if (newDataList.length > 0) {
					if (!(newDataList.find(item => item[this.noRepeats] == item[this.noRepeats]))) {
						newDataList = [
							...newDataList,
							item
						];
					}
				}
				else {
					newDataList = [
						...newDataList,
						item
					];
				}
			}
		});

		return newDataList;
	}

	getStringByRecord(record, value) {
		for (let textValue of value.split('.')) {
			record = record[textValue];
		}

		return record;
	}

	checkDatetimeAndDate(stringDate) {
		const regexDatetime = /[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.[0-9]{3}Z/;
		const regexDate = /[0-9]{4}-[0-9]{2}-[0-9]{2}/;
		const regexTime = /[0-9]{2}:[0-9]{2}:[0-9]{2}.[0-9]{3}Z/;

		return (regexDatetime.test(stringDate) || regexDate.test(stringDate) || regexTime.test(stringDate));
	}

	convertDatetimeAndDateToString(stringDate) {
		var formatDate = '',
			gmtDate = new Date(stringDate),
			utcDate = gmtDate.getUTCDate() < 10 ? ('0' + gmtDate.getUTCDate()) : gmtDate.getUTCDate(),
			utcMonth = (gmtDate.getUTCMonth() + 1) < 10 ? '0' + (gmtDate.getUTCMonth() + 1) : (gmtDate.getUTCMonth() + 1),
			utcYear = gmtDate.getUTCFullYear();

		formatDate = `${utcDate}/${utcMonth}/${utcYear}`;

		return formatDate;
	}
}