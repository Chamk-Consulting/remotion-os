const ctx=require('./harness.js');const vm=require('vm');
console.log(vm.runInContext("Object.keys(CAI).join(',')",ctx));
console.log(vm.runInContext("(()=>{const r=[];const v=caPgParse('255',10);r.push(JSON.stringify(caPgFit(v,'8',true),(k,x)=>typeof x==='bigint'?x.toString():x));r.push(caPgSigned(255n,'8').toString());r.push(caPgFit(-1n,'16',false).u.toString());r.push(caIsPrime(2n**61n-1n));r.push(caFactor(600851475143n).join('*'));r.push(caRatStr(caRatOp(caRatParse('1 1/2'),caRatParse('2/3'),'*')));r.push(caRatDec(caRat(1n,7n)));r.push(caBestFrac(Math.PI,1000).join('/'));return r.join(' | ')})()",ctx));
console.log(vm.runInContext("Object.keys(CA_FN).length+' fns: '+Object.keys(CA_FN).join(',')",ctx));
console.log(vm.runInContext("CA_ERR && Object.keys(CA_ERR).length",ctx));
