/********************************************************************************************
* @ClassName : ExportDataController
* @Purpose   : Controller class for exportDataScreen lwc component
* @Author    : Luca Bobbio
* @Date      : 19/12/2023

********************************************************************************************/
public with sharing class ExportDataController {
    /*
    * @MethodName : getOrderDataToExport
    * @Purpose    : Query Order records using parameter as a filter, returns query records serialize as JSON
    * @Return     : String JSON.serialize()
    * @Parameters : String accountId, String addressId
    * @Author     : Luca Bobbio
    */ 
    @AuraEnabled(cacheable=true)
    public static String getOrderDataToExport(String accountId, String addressId){
        List<OrderData> ordersToExport = new List<OrderData>();
        try {

            List<Order> ordersList = [
                SELECT Id, AccountId, Account.Name, OrderNumber, Status, Address__c, Address__r.Name, TotalAmount
                FROM Order 
                WHERE AccountId = :accountId AND Address__c = :addressId
            ];

            if(ordersList != null && !ordersList.isEmpty()){
                for (Order order : ordersList) {
                    OrderData orderData = new OrderData();
                    orderData.orderId = order.Id;
                    orderData.orderNumber = order.OrderNumber;
                    orderData.accountId = order.AccountId;
                    orderData.accountName = order.Account.Name;
                    orderData.addressId = order.Address__c;
                    orderData.addressName = order.Address__r.Name;
                    orderData.orderStatus = order.Status;
                    orderData.orderTotalAmount = String.valueOf(order.TotalAmount);
                    ordersToExport.add(orderData);
                }
            }
            
            return ordersToExport.isEmpty() ? null : JSON.serialize(ordersToExport);
        } catch (Exception e) {
            System.debug('Error fetching order: ' + e.getMessage());
            return e.getMessage();
        }
    }

    /*
    * @InnerClassName : OrderData
    * @Purpose        : Order model for lwc
    * @Author         : Luca Bobbio
    */
    public class OrderData {
        public String orderId {get; set;}
        public String orderNumber {get;set;}
        public String accountId {get; set;}
        public String accountName {get; set;}
        public String addressId {get; set;}
        public String addressName {get; set;}       
        public String orderStatus {get; set;}       
        public String orderTotalAmount {get; set;}
    }
}