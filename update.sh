set -e
npm run build
git pull origin master
git add -A
git commit -m "editor"
git push origin master