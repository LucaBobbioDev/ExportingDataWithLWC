import { LightningElement, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { loadScript } from "lightning/platformResourceLoader";

import getOrderDataToExport from '@salesforce/apex/ExportDataController.getOrderDataToExport';
import workbook from "@salesforce/resourceUrl/writeexcelfile";


const columns = [
    { label: 'Nome da Conta', fieldName: 'accountName' },
    { label: 'Código do Pedido', fieldName: 'orderNumber' },
    { label: 'Status', fieldName: 'orderStatus' },
    { label: 'Endereço', fieldName: 'addressName' },
    { label: 'Valor Total', fieldName: 'orderTotalAmount' },
];

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

    get buttonText() {
        return !this.isXLS && !this.isXLSX ? 'Exportar':(this.isXLS && !this.isXLSX ? 'Exportar XLS' : 'Exportar XLSX');
    }

    get getStyle() {
        return 'width: ' + this.percentage + '% !important';
    }

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

    selectItemRegister(event){
        const { record } = event.detail;
        if(event.target.dataset.targetId == 'account'){
            this.selectedAccount = {Id: record.Id, Name: record.Name};
        }else{
            this.selectedAddress = {Id: record.Id, Name: record.Name};
        }
    }

    removeItemRegister(event){
        if(event.target.dataset.targetId == 'account'){
            this.selectedAccount = '';
        }else{
            this.selectedAddress = '';
        }
    }

    handleCheckBoxChange(event){
        const { name, checked } = event.target;

        this.isXLSX = name === 'xlsxFile' && checked;
        this.isXLS = name === 'xlsFile' && checked;
        this.disabledField = checked && (this.isXLSX || this.isXLS);

        // if(name == 'xlsxFile' && checked === true){
        //     this.isXLSX = checked;
        //     this.isXLS = !checked;
        //     this.disabledField = checked;
        // } else if (name == 'xlsFile' && checked === true){
        //     this.isXLS = checked;
        //     this.isXLSX = !checked;
        //     this.disabledField = checked;
        // } else {
        //     this.isXLS = checked; 
        //     this.isXLSX = checked;
        //     this.disabledField = checked; 
        // }
    }

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

    async exportToXLSX(){
        let _self = this;
        let data = _self.buildReportDoc();
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
    
    isFilled(field) {
        return ((field !== undefined && field != null && field != '') || field == 0 || field == []);
    }

    showToast(type, title, message) {
        let event = new ShowToastEvent({
            variant: type,
            title: title,
            message: message,
        });
        this.dispatchEvent(event);
    }
}