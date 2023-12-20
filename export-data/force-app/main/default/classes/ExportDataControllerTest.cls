@IsTest
public with sharing class ExportDataControllerTest {
    @TestSetup
	public static void makeData() {
		Account newAccount = new Account(Name = 'Account Test', CNPJ__c = '54.392.250/0001-43');
		insert newAccount;

        Address__c newAddress1 = new Address__c(Name = 'Test Address 1', ExternalId__c = '230');
        insert newAddress1;

        Address__c newAddress2 = new Address__c(Name = 'Test Address 2', ExternalId__c = '450');
        insert newAddress2;

        Order newOrder1 = new Order(
			AccountId = newAccount.Id,
            OrderNumber__c = '3435',
            Address__c = newAddress1.Id,
			Pricebook2Id = Test.getStandardPricebookId(),
			EffectiveDate = Date.today(),
			Status = 'Draft'
		);
		insert newOrder1;

        Order newOrder2 = new Order(
			AccountId = newAccount.Id,
            OrderNumber__c = '3512',
            Address__c = newAddress2.Id,
			Pricebook2Id = Test.getStandardPricebookId(),
			EffectiveDate = Date.today(),
			Status = 'Draft'
		);
		insert newOrder2;
    }

    @isTest
    static void testGetOrderDataToExport() {
        String accountId = getAccountId();
        String addressId = getAddressId();

        Test.startTest();
            String result = ExportDataController.getOrderDataToExport(accountId, addressId);
        Test.stopTest();
        System.assertNotEquals(null, result, 'Result is not null');
    }

    public static String getAccountId() {
        Account currentAccount = [SELECT Id FROM Account LIMIT 1];
        return currentAccount != null ? String.valueOf(currentAccount.Id) : null;
    }
    
    public static String getAddressId() {
        Address__c currentAddress = [SELECT Id FROM Address__c LIMIT 1];
        return currentAddress != null ? String.valueOf(currentAddress.Id) : null;
    }
    
}