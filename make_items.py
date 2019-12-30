with open('items/ip1k.txt', 'w') as f:
  for i in range(10000):
    f.write('https://ipinfo.io/json\n')
