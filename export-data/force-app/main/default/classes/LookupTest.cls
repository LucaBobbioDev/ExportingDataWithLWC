@IsTest
public with sharing class LookupTest {
	@TestSetup
	public static void makeData() {
		Account newAccount = new Account(Name = 'Account Test');
		insert newAccount;

		Order newOrder = new Order(
			AccountId = newAccount.Id,
			Pricebook2Id = Test.getStandardPricebookId(),
			EffectiveDate = Date.today(),
			Status = 'Draft'
			//ExternalId__c = '123'
		);
		insert newOrder;
	}

	@IsTest
	public static void getAccountRecordsTest() {
		List<SObject> sobjectList = new List<SObject>();
		Account currentAccount = getAccount();
		Lookup.RequestData requestData = new Lookup.RequestData();
		Lookup.Condition condition = new Lookup.Condition();

		condition.whereField = 'Id';
		condition.whereValue = null;
		condition.whereValueList = new List<Object>();
		condition.operator = '<>';

		requestData.recordId = '';
		requestData.targetObject = 'Account';
		requestData.searchValue = currentAccount.Name;
		requestData.searchFieldList = new List<String>{ 'Name' };
		requestData.moreFieldList = new List<String>{ 'Type' };
		requestData.orderByFieldList = new List<String>{ 'Name' };
		requestData.conditionList = new List<Lookup.Condition>{ condition };

		Test.startTest();
			List<String> stringList = Lookup.convertObjectListToStringList(null);
			System.assertEquals(0, stringList.size(), 'Size String List');
			List<Decimal> decimalList = Lookup.convertObjectListToDecimalList(null);
			System.assertEquals(0, decimalList.size(), 'Size Decimal List');

			sobjectList = Lookup.getRecords(requestData);
			System.assertEquals(1, sobjectList.size(), 'Size SObject Account List 1');
			System.assertEquals(currentAccount.Id, sobjectList[0].Id, 'Account Id');

			condition.operator = 'IN';
			condition.whereValue = null;
			condition.whereValueList = new List<String>{ currentAccount.Id };

			sobjectList = Lookup.getRecords(requestData);
			System.assertEquals(1, sobjectList.size(), 'Size SObject Account List 2');
			System.assertEquals(currentAccount.Id, sobjectList[0].Id, 'Account Id');

			condition.whereField = 'Name';
			condition.whereValue = 'Error Test';
			condition.operator = '=';
			sobjectList = Lookup.getRecords(requestData);
			System.assertEquals(0, sobjectList.size(), 'Size SObject Account List 3');

			condition.whereValue = '% Test';
			condition.operator = 'LIKE';

			sobjectList = Lookup.getRecords(requestData);
			System.assertEquals(1, sobjectList.size(), 'Size SObject Account List 4');
			System.assertEquals(currentAccount.Id, sobjectList[0].Id, 'Account Id');

			condition.whereValue = '';
			condition.operator = 'LIKE';

			sobjectList = Lookup.getRecords(requestData);
			System.assertEquals(1, sobjectList.size(), 'Size SObject Account List 5');
			System.assertEquals(currentAccount.Id, sobjectList[0].Id, 'Account Id');
		Test.stopTest();
	}

	@IsTest
	public static void getOrderRecordsTest() {
		List<SObject> sobjectList = new List<SObject>();
		Order currentOrder = getOrder();
		Lookup.RequestData requestData = new Lookup.RequestData();
		Lookup.Condition condition = new Lookup.Condition();

		condition.whereField = 'TotalAmount';
		condition.whereValue = null;
		condition.whereValueList = new List<Object>{ currentOrder.TotalAmount };
		condition.operator = 'IN';

		requestData.recordId = '';
		requestData.targetObject = 'Order';
		requestData.searchValue = currentOrder.OrderNumber;
		requestData.searchFieldList = new List<String>{ 'OrderNumber' };
		requestData.moreFieldList = new List<String>{ 'TotalAmount' };
		requestData.conditionList = new List<Lookup.Condition>{ condition };

		Test.startTest();
			sobjectList = Lookup.getRecords(requestData);
			System.assertEquals(1, sobjectList.size(), 'Size SObject Order List 1');
			System.assertEquals(currentOrder.TotalAmount, sobjectList[0].get('TotalAmount'), 'Order TotalAmount');
		Test.stopTest();
	}

	public static Account getAccount() {
		Account currentAccount;

		for (Account retrievedAccount : [SELECT Id, Name FROM Account LIMIT 1]) {
			currentAccount = retrievedAccount;
		}

		return currentAccount;
	}

	public static Order getOrder() {
		Order currentOrder;

		for (Order retrievedOrder : [SELECT Id, OrderNumber, TotalAmount FROM Order LIMIT 1]) {
			currentOrder = retrievedOrder;
		}

		return currentOrder;
	}
}