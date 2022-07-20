# masterchef_test

## Run DISS test

### Install Dependencies
```
yarn install
```



### Run Tests
```
npx hardhat run diss_deploy/xxxxxxx.ts 
```

### Tests Details
- *test1* - 1 pool con Alice recibiendo todo el reward
- *test2* - 2 pools mismo peso, Bob se suma mas tarde que alice, reciben la misma cantidad de reward
- *test3* - 2 pools diferente peso, para comprobar la diferencia de reward entre Alice y Bob
- *test4* - 2 pools mismo peso, Carol se suma después y vemos como a Bob se le divide el reward con Carol
- *test5* - 2 pools mismo peso, Carol se suma después con x10 veces el LP de Bob y vemos como Bob empoeza a recibir mucho menos reward.