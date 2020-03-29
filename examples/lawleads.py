#!/bin/env python

"""
Invoke with:

python lawleads.py {{API_KEY}}

This program searches the items on google and visits 
each url and extracts email addresses and phone numbers 
from the websites.
"""
import requests
import json
import sys
import csv

API_KEY = sys.argv[1]
API_URL = 'https://scrapeulous.com/api'

def google_search():
	items = ['criminal lawyer new york', 'criminal lawyer boston', 'criminal lawyer san francisco',
	         'criminal lawyer seattle', 'criminal lawyer detroit', 'civil rights violation lawyer new york',
	         'civil rights violation lawyer boston', 'civil rights violation lawyer san francisco',
	         'civil rights violation lawyer seattle', 'civil rights violation lawyer detroit', 'dui lawyer new york',
	         'dui lawyer boston', 'dui lawyer san francisco', 'dui lawyer seattle', 'dui lawyer detroit',
	         'business lawyer new york', 'business lawyer boston', 'business lawyer san francisco',
	         'business lawyer seattle', 'business lawyer detroit', 'immigration lawyer new york', 'immigration lawyer boston',
	         'immigration lawyer san francisco', 'immigration lawyer seattle', 'immigration lawyer detroit']

	payload = {
	    "API_KEY": API_KEY,
	    "function": "https://raw.githubusercontent.com/NikolaiT/scrapeulous/master/google_scraper.js",
	    "items": items,
	    "region": "us",
	    "options": {
	       "google_params": {
	         "num": 20,
	         "hl": "en",
	         "gl": "en",
	       },
	       "num_pages": 1,
	    }
	}

	r = requests.post(API_URL, data=json.dumps(payload))
	results = r.json()

	# extract links from SERP
	urls = []
	for res in results:
		if isinstance(res['result'], list):
		    for link in res['result'][0]['results']:
		        urls.append(link["link"])

	# filter links
	filter_domains = ["youtube.com", "wikipedia.org",
	 "yelp.com", "facebook.com", "en.wikipedia.org",
	  "www.linkedin.com", "linkedin.com"]

	filtered = []
	for url in urls:
	    badboy = False
	    for f in filter_domains:
	        if f in url:
	            badboy = True
	            break
	    if not badboy:
	    	filtered.append(url)

	print('filtered {} urls. {} left.'.format(len(urls)-len(filtered), len(filtered)))
	return list(set(filtered))


def lead_search(urls):
	"""
	Crawl in chunks of 100 items
	"""
	results = []
	for i in range(0, len(urls), 99):
		chunk = urls[i:i+99]
		payload = {
		    "API_KEY": API_KEY,
		    "function": "https://raw.githubusercontent.com/NikolaiT/scrapeulous/master/leads.js",
		    "items": chunk,
		    "region": "us",
		}
		r = requests.post(API_URL, data=json.dumps(payload))
		results.extend(r.json())
	return results

def write_csv(leads):
	data = []
	for lead in leads:
		data.append({
			"url": lead["item"],
			"page_title": lead["result"].get('page_title'),
			"email_addresses": lead["result"].get('email_addresses'),
			"phone_numbers": lead["result"].get('phone_numbers'),
		})

	with open('law-leads.csv', 'w') as csvfile:
	    fieldnames = ['url', 'page_title', 'email_addresses', 'phone_numbers']
	    writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
	    writer.writeheader()
	    for row in data:
	    	writer.writerow(row)

def main():
	urls = google_search()
	leads = lead_search(urls)
	write_csv(leads)

main()