import { LightningElement, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { loadScript } from "lightning/platformResourceLoader";

import getOrderDataToExport from '@salesforce/apex/ExportDataController.getOrderDataToExport';
import workbook from "@salesforce/resourceUrl/writeexcelfile";

/**
 * The columns configuration for a lightning-datatable.
 * @type {Object[]}
 */
const columns = [
    { label: 'Nome da Conta', fieldName: 'accountName' },
    { label: 'Código do Pedido', fieldName: 'orderNumber' },
    { label: 'Status', fieldName: 'orderStatus' },
    { label: 'Endereço', fieldName: 'addressName' },
    { label: 'Valor Total', fieldName: 'orderTotalAmount' },
];

/**
 * Represents the ExportDataScreen component responsible for exporting data.
 * @extends {LightningElement}
 */
export default class ExportDataScreen extends LightningElement {
    @track disabledField = false;
    @track isXLSX = false;
    @track isXLS = false;
    @track records = [];
    @track selectedAccount;
    @track selectedAddress;

    accountFields = ['Name'];
    accountOptions = { title: 'Name' };

    addressFields = ['Name', 'ExternalId__c'];
    addressOptions = { title: 'Name', description: 'ExternalId__c'};
    
    columns = columns;

    /**
     * Gets the text for the export button based on file format selection.
     * @type {string}
     */
    get buttonText() {
        return !this.isXLS && !this.isXLSX ? 'Exportar':(this.isXLS && !this.isXLSX ? 'Exportar XLS' : 'Exportar XLSX');
    }

    /**
     * Gets the style for the export button.
     * @type {string}
     */
    get getStyle() {
        return 'width: ' + this.percentage + '% !important';
    }

    /**
     * Defines the logic for the export button based on file format selection.
     * @type {Getter}
     * @returns {Function} A function that executes the appropriate export method based on the selected file format.
     */
    get buttonLogic(){
        return () => this.isXLS ? this.exportOrderData() : this.exportToXLSX();
    }

    renderedCallback() {
        if(this.isXLSX === false) return;
        this.isXLSX = true;
        loadScript(this, workbook )
            .then(async (data) => {
                console.log("success =>", data);
            })
            .catch(error => {
                console.log("failure =>", error);
            });
    }

    /**
     * Searches for records based on the selected account and address. 
     * If both account and address are selected, it fetches order data to export.
     * @returns {void} This function does not return a value directly. It asynchronously updates the component's state.
     */
    searchRecords() {
        if (this.isFilled(this.selectedAccount) && this.isFilled(this.selectedAddress)) {
            getOrderDataToExport({ accountId: this.selectedAccount.Id, addressId: this.selectedAddress.Id })
                .then(result => {
                    console.log('result =>' + JSON.stringify(result));
                    if(this.isFilled(result)){
                        this.records = this.records.concat(JSON.parse(result));
                    } else{
                        this.showToast('error', 'Não Encontrado!', 'Não foi encontrado nenhum pedido com esses dados')
                        return;
                    }
                })
                .catch(error => {
                    this.showToast('error', 'Erro!', 'Houve um Erro na busca de pedido' + error +'!')
                });
        }else{
            this.showToast('warning', 'Atenção', 'Campos de conta ou endereço não preenchidos')
            console.error('Campos de conta ou endereço não preenchidos');
        }
    }

    /**
     * Handles the selection of an item in the registration process.
     * @param {Event} event - The event containing the selected record details.
     */
    selectItemRegister(event){
        const { record } = event.detail;
        if(event.target.dataset.targetId == 'account'){
            this.selectedAccount = {Id: record.Id, Name: record.Name};
        }else{
            this.selectedAddress = {Id: record.Id, Name: record.Name};
        }
    }

    /**
     * Removes the selected item from the registration process.
     * @param {Event} event - The event containing the target ID of the item to be removed.
     */
    removeItemRegister(event){
        if(event.target.dataset.targetId == 'account'){
            this.selectedAccount = '';
        }else{
            this.selectedAddress = '';
        }
    }

    /**
     * Handles the change event of a checkbox.
     * @param {Event} event - The event triggered by the checkbox change.
     */
    handleCheckBoxChange(event){
        const { name, checked } = event.target;

        this.isXLSX = name === 'xlsxFile' && checked;
        this.isXLS = name === 'xlsFile' && checked;
        this.disabledField = checked && (this.isXLSX || this.isXLS);
    }

    /**
     * Builds a report document based on selected rows and export format.
     * @returns {string|string[]} The report document content as a string if the export format is XLS, 
     * or an array of selected rows if the export format is XLSX.
     */
    buildReportDoc(){
        let selectedRows = this.template.querySelector("lightning-datatable").getSelectedRows();

        if(selectedRows.length == 0){
            this.showToast('warning', 'Atenção', 'Selecione pelo menos uma conta')
            return null;
        }
        let doc;
        if(this.isXLS === true && this.isXLSX === false){
            doc = '<table>'
            doc += '<tr>';
            this.columns.forEach(header => {            
                doc += '<th>'+ header.label +'</th>'           
            });
            doc += '</tr>';
    
            selectedRows.forEach(row => {
                doc += '<tr>';
                doc += '<th>'+row.accountName+'</th>'; 
                doc += '<th>'+row.orderNumber+'</th>'; 
                doc += '<th>'+row.orderStatus+'</th>';
                doc += '<th>'+row.addressName+'</th>'; 
                doc += '<th>'+row.orderTotalAmount+'</th>'; 
                doc += '</tr>';
            });
            doc += '</table>';
            return doc;
        } else {
            return doc = selectedRows;
        }
    }

    /**
     * Exports order data to a downloadable file.
     * @returns {void} This method initiates the download process if the report is successfully generated, otherwise it displays an error toast.
     */
    exportOrderData(){
        let report = this.buildReportDoc();
        if(this.isFilled(report)){
            //var element = 'data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,' + encodeURIComponent(report);
            //var element = 'data:text/csv;charset=utf-8,' + encodeURIComponent(report);
            var element = 'data:application/vnd.ms-excel,' + encodeURIComponent(report);
            let downloadElement = document.createElement('a');
            downloadElement.href = element;
            downloadElement.target = '_self';
            downloadElement.download = 'Relatório - Pedidos.xls';
            document.body.appendChild(downloadElement);
            downloadElement.click();
        } else{
            this.showToast('error', 'Erro', 'Não foi possível gerar o relatório!')
            return;
        }    
    }

    /**
     * Asynchronously exports order data to an XLSX file.
     * @returns {Promise<void>} A Promise that resolves after the XLSX file is generated and a success toast is displayed, 
     * or rejects if the report generation fails and an error toast is displayed.
     */
    async exportToXLSX(){
        let _self = this;
        let data = _self.buildReportDoc();

        /**
         * Configuration schema for defining column properties in an export document.
         * @type {Object[]}
         */
        const schema = [
            {
              column: 'Nome da Conta',
              align: 'center',
              width: 30,
              borderStyle:'thin',
              borderColor:'#000000',
              fontFamily: 'Arial',
              fontSize: 12,
              type: String,
              value: d => d.accountName
            },
            {
              column: 'Código do Pedido',
              align: 'center',
              width: 30,
              borderStyle:'thin',
              borderColor:'#000000',
              fontFamily: 'Arial',
              fontSize: 12,
              type: String,
              value: d => d.orderNumber
            },
            {
              column: 'Status',
              align: 'center',
              width: 30,
              borderStyle:'thin',
              borderColor:'#000000',
              fontFamily: 'Arial',
              fontSize: 12,
              type: String,
              value: d => d.orderStatus
            },
            {
              column: 'Endereço',
              align: 'center',
              width: 30,
              borderStyle:'thin',
              borderColor:'#000000',
              fontFamily: 'Arial',
              fontSize: 12,
              type: String,
              value: d => d.addressName
            },
            {
              column: 'Valor Total',
              align: 'center',
              width: 30,
              fontFamily: 'Arial',
              fontSize: 12,
              borderStyle:'thin',
              borderColor:'#000000',
              type: String,
              value: d => d.orderTotalAmount
            }
        ]; 
        if(this.isFilled(data)){
            await writeXlsxFile(data, {
                schema,
                fileName: 'Relatório - Pedidos.xlsx',
                fontFamily: 'Arial',
                fontSize: 12,
                headerStyle: {
                    backgroundColor: '#51DA8F',
                    fontWeight: 'bold',
                    align: 'center',
                    color:'#000000',
                    borderStyle:'thin',
                    borderColor:'#000000'
                }
            });
            this.showToast('success', 'Sucesso', 'O relatório foi gerado!')
        } else {
            this.showToast('error', 'Erro', 'Não foi possível gerar o relatório!');
            return;
        }
    }
    
    /**
     * Checks if a field is filled with data.
     * @param {*} field - The field to be checked for data.
     * @returns {boolean} Returns true if the field isn't undefined, not null, not an empty string, not an empty array, or not equal to 0.
     * Otherwise, returns false.
     */
    isFilled(field) {
        return ((field !== undefined && field != null && field != '') || field == 0 || field == []);
    }

    /**
    * Displays a toast message with the specified type, title, and message.
    * @param {string} type - The type of toast message (error, warning, success).
    * @param {string} title - The title of the toast message.
    * @param {string} message - The content of the toast message.
    */
    showToast(type, title, message) {
        let event = new ShowToastEvent({
            variant: type,
            title: title,
            message: message,
        });
        this.dispatchEvent(event);
    }
}