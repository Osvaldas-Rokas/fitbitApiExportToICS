'use strict';
const moment = require('moment');
const async = require('async');
const rp = require('request-promise');
const ical = require('ical-generator');

exports.handler = (event, context, callback) => {
	getFitbitActivityCalendar(function(data) {
		callback(null, data);
	});
};

/**
 * Gets Fitbit activity calendar
 * Required lambda variables:
 * * URL_FITBIT_ACTIVITIES_API
 * * URL_GET_ACCESS_TOKEN_API
 * * URL_REFRESH_TOKEN_API
 * Also remember to set a Gateway API > Integration response > Body Mapping templates > Content-Type: application/json > Body: #set($inputRoot = $input.path('$')); $inputRoot.body
 * @param {*} cb Callback for AWS Lambda
 */
function getFitbitActivityCalendar(cb) {
	let urlFitbitActivities = process.env.URL_FITBIT_ACTIVITIES_API + moment().format('YYYY-MM-DD');

	let isTokenAlreadyRefreshed = false;
	let cal = ical({
		domain: 'rokaso.com',
		name: 'FitBit activity calendar',
	});

	rp
		.get(process.env.URL_GET_ACCESS_TOKEN_API)
		.then((token) => {
			let repeat = true;
			async.whilst(function() {
				return repeat;
			},
			function fetchingFitbitData(next) {
				rp.get({
					uri: urlFitbitActivities,
					json: true,
				})
					.auth(null, null, true, token)
					.then((data) => {
						data.activities.forEach((s) => {
							cal.createEvent({
								start: new Date(s.startTime),
								end: new Date(new Date(s.startTime).getTime() + s.duration),
								summary: `Fitbit: ${s.activityName}`,
								description: `Avg heart-rate: ${s.averageHeartRate}, calories: ${s.calories}`,
							});
						});
						if (data.pagination.next === '') {
							repeat = false;
						} else {
							urlFitbitActivities = data.pagination.next;
						}
						repeat = false;

						next();
					})
					.catch(function(err) {
						if (typeof err.error.errors[0] !== 'undefined') {
							switch (err.error.errors[0].errorType) {
							case 'expired_token':
								if (!isTokenAlreadyRefreshed) {
									console.log('Expired token error. Trying to handle by refreshing token');
									rp
										.get(process.env.URL_REFRESH_TOKEN_API)
										.then((token) => {
											console.log('Calling refreshToken API');
											isTokenAlreadyRefreshed = true;
											fetchingFitbitData();
										});
								} else {
									console.log('Expired token error. Refreshing a token didn\'t help');
								}
								break;
							case 'invalid_token':
								console.log('Invalid token error is currently NOT handled');
								break;
							default:
								console.log(`Unhandled error -- ${err.message}`);
							}
						} else {
							console.log(`Unhandled error: ${err}`);
						}
					});
			},
			function(err, data) {
				return cb({
					'body': cal.toString(),
				});
			});
		});
}
