import glob

categories = glob.glob('*/*.json');

for cat in categories:
    print cat.split('.json')[0]
