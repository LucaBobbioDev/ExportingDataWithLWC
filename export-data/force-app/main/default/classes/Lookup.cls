public with sharing class Lookup {
	@AuraEnabled
	public static List<SObject> getRecords(RequestData requestData) {
		System.debug('requestData => ' + requestData);

		String query = getQueryBase(requestData);

		System.debug('query => ' + query);

		query += ' LIMIT 15';

		return Database.query(query);
	}

	public static String getQueryBase(RequestData requestData) {
		String query = 'SELECT Id, #GET_FIELDS# FROM ' + requestData.targetObject;
		query += String.isBlank(requestData.recordId) ? ' WHERE Id != NULL ' : ' WHERE Id = \'' + requestData.recordId + '\'';

		Set<String> fieldSet = getQueryFieldSet(requestData);
		String fields = String.join((Iterable<String>)fieldSet, ', ');

		query = query.replace('#GET_FIELDS#', fields);

		if (!String.isBlank(requestData.recordId)) return query;

		if (!String.isBlank(requestData.searchValue)) {
			query += 'AND ( #SEARCH_BASE# )';

			String searchBase = parseSearchFields(requestData.searchFieldList);

			query = query.replaceAll('#SEARCH_BASE#', searchBase);
			query = query.replaceAll('#SEARCH_VALUE#', String.escapeSingleQuotes(requestData.searchValue));
		}
		if (requestData.conditionList != null && !requestData.conditionList.isEmpty()) {
			query += parseWhereFields(requestData.conditionList);
		}
		if (requestData.orderByFieldList != null && !requestData.orderByFieldList.isEmpty()) {
			query += ' ORDER BY ' + String.join(requestData.orderByFieldList, ', ');
		}

		return query;
	}

	public static Set<String> getQueryFieldSet(RequestData requestData) {
		Set<String> fieldSet = new Set<String>();

		if (requestData.searchFieldList != null && !requestData.searchFieldList.isEmpty()) {
			fieldSet.addAll(requestData.searchFieldList);
		}
		if (requestData.moreFieldList != null && !requestData.moreFieldList.isEmpty()) {
			fieldSet.addAll(requestData.moreFieldList);
		}

		return fieldSet;
	}

	public static String parseSearchFields(List<String> searchFieldList) {
		String searchBase = '';

		searchBase += String.join(searchFieldList, ' LIKE \'%#SEARCH_VALUE#%\' OR ');
		searchBase += ' LIKE \'%#SEARCH_VALUE#%\'';

		return searchBase;
	}

	public static String parseWhereFields(List<Condition> conditionList) {
		String conditionBase = '';

		for (Condition condition : conditionList) {
			Object whereValue = condition.whereValue;

			if (condition.operator == 'IN' || condition.operator == 'NOT IN') {
				if (!condition.whereValueList.isEmpty()) {
					whereValue = parseINWhereFields(whereValue, condition.whereValueList);
				}
			}
			else if (condition.operator == 'LIKE') {
				if (condition.whereValue == '') {
					whereValue = '\'%%\'';
				}
				else {
					whereValue = '\'' + condition.whereValue + '\'';
				}
			}
			else if (condition.whereValue instanceof String) {
				if (!checkDatesAndTimes((String)condition.whereValue)) {
					whereValue = '\'' + condition.whereValue + '\'';
				}
			}

			conditionBase += ' AND ' + condition.whereField + ' ' + condition.operator + ' ' + whereValue;
		}

		return conditionBase;
	}

	public static Object parseINWhereFields(Object whereValue, List<Object> whereValueList) {
		String value = '';

		if (whereValueList[0] instanceof Decimal || whereValueList[0] instanceof Integer) {
			List<Decimal> fieldValueList = convertObjectListToDecimalList(whereValueList);
			value += String.join(fieldValueList, ', ');
		}
		else if (whereValueList[0] instanceof String) {
			List<String> fieldValueList = convertObjectListToStringList(whereValueList);
			value += '\'' +  String.join(fieldValueList, '\', \'') + '\'';
		}

		whereValue = '(' + value + ')';

		return whereValue;
	}

	public static Boolean checkDatesAndTimes(String stringToCheck) {
		String regexDatetime = '[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.[0-9]{3}-[0-9]{2}:[0-9]{2}';
		String regexDate = '[0-9]{4}-[0-9]{2}-[0-9]{2}';
		String regexTime = '[0-9]{2}:[0-9]{2}:[0-9]{2}.[0-9]{3}Z';

		Pattern datetimePattern = Pattern.compile(regexDatetime);
		Pattern datePattern = Pattern.compile(regexDate);
		Pattern timePattern = Pattern.compile(regexTime);

		Matcher matchDatetime = datetimePattern.matcher(stringToCheck);
		Matcher matchDate = datePattern.matcher(stringToCheck);
		Matcher matchTime = timePattern.matcher(stringToCheck);

		return (matchDatetime.matches() || matchDate.matches() || matchTime.matches());
	}

	public static List<String> convertObjectListToStringList(List<Object> objectList) {
		if (objectList == null) {
			return new List<String>();
		}

		List<String> stringList = new List<String>();
		for (Object field : objectList) {
			if (field != null) {
				stringList.add((String)field);
			}
		}

		return stringList;
	}

	public static List<Decimal> convertObjectListToDecimalList(List<Object> objectList) {
		if (objectList == null) {
			return new List<Decimal>();
		}

		List<Decimal> decimalList = new List<Decimal>();
		for (Object field : objectList) {
			if (field != null) {
				decimalList.add((Decimal)field);
			}
		}

		return decimalList;
	}

	public class RequestData {
		@AuraEnabled
		public String recordId {get; set;}
		@AuraEnabled
		public String targetObject {get; set;}
		@AuraEnabled
		public String searchValue {get; set;}

		@AuraEnabled
		public List<String> searchFieldList {get; set;}
		@AuraEnabled
		public List<String> moreFieldList {get; set;}

		@AuraEnabled
		public List<Condition> conditionList {get; set;}

		@AuraEnabled
		public List<String> orderByFieldList {get; set;}

		public RequestData() {}
	}

	public class Condition {
		@AuraEnabled
		public String whereField {get; set;}
		@AuraEnabled
		public Object whereValue {get; set;}
		@AuraEnabled
		public String operator {get; set;}
		@AuraEnabled
		public List<Object> whereValueList {get; set;}

		public Condition() {}
	}
}