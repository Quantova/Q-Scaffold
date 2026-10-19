import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const WORDS = new Set("df864c0596,bcffaab67d,b0ad6bc193,a4262e1c9b,88c7f08d0b,5ad38304b5,22b090dd46,c59ddd3f7b,5caab99c78,a60a2bb10f,a0561fd649,5489eb1d2a,9af211329b,603ec1f360,1c6b6b9e01,ae5eebff12,2f378e6ce9,d5df61d742,deb538b50c,f83f07be16,bd938c688f,50c9c4aeb4,dbc2c9ff59,e5c6fde869,f1f61cc721,7e9e5ac30f,d4d6f77527,d80c9bf910,2549c096fc,358970fc5c,7fdc3e8038,e40dfff1a7,02c9744768,4b60c5c6f8,75c929eb04,f901528b18,180366dd3b,b4c9e14061,013f54400c,d4f0bc5a29,94d5c9d960,d0b4034c6c,a27f98238d,9fe430e527,ccc9ff052a,0145be012a,5e94ec1394,ca7cad8166,c7c7eb1087,df905058dd,a49c1d0380,5ef5ef0364,00e7684c0e,4100837357,9602eec8ca,facf8b54e5,8ed3f6ad68,ea53396cae,bb8c8605c5,7c0ea37f8b,9cdc6c47aa,8dd9ed1079,01431b46f1,766c1d13a3,cf38d95c9c,8648a03e60,f44ceb062e,79bfb0e2ba,41dda3b211,d4cc56aa47,49387897be,0a96f19607,ab91a82d14,9abfc382e3,f178ad42d8,ee5e2878c4,ae448ac86c,0db52f4076,47dd127460,e08ac7e5b3,ab0231f72d,d6a7cd2a73,1d40973ecc,e161201db0,adf5a890f0,3a7bd3e236,74e21680ea,aa68908295,890cabe271,806a7e7b17,4a91ee5f01,572e31f55b,92a4753ceb,ddf7ff5ebd,dc083dbe05,d81ea1595a,b2fd5cdba2,a4a00c840f,3c1f2776b8,7f1c0fd436,6dc09a3007,864ea39fe7,d3cec99112,4edfbd28d0,70b1e8e067,1322ce8bd7,2f2fc7f2e9,bd8bf4f1e8,8b074093a5,d59386e0ae,7b0363b655,82e05dae00,695b2ea90e,23a1f74bc5,1bf521836d,fca3067963,192f9a06d1,b67cab457e,8bec0a29bc,95482ba25b,b81f37a043,c2afdd3856,a892fec0a7,6364858689,929260ad9b,defae04158,184df936d4,f9c9baac90,3270f7fe8a,f245940166,8bf9fd4be0,378ce56a9d,705db0603f,87e1315329,8ee41686ee,d39c118729,a3ca38ef0e,4adf753144,9cca070334,8805cdea2b,c018019b6a,5751e048eb,4095f60305,e9de08263f,add1743eae,b493d48364,8c7ed2d9be,fcde2b2edb,cd288d089e,60bca9331d,e8bbe6423a,cae662172f,fbb7b5bf4c,fa76d99ad9,16f5e2322d,ab36e84344,b3fa55f98f,b5610de1f6,a511aeeeb8,9ebb1e6f5b,aa415c4e88,6db7d803e7,e6f07d43b5,e6ac32cfa8,b1b886ce5f,f078209dfe,8ada24bf6b,5f4f045d31,1b32c28cb3,e97469619c,8f4375ec65,3fff151394,d7d5dcc369,fbb27fbdc4,5e8818d1dd,d29af8a2e1,c0e0efc4fc,163c18e006,f08dd851c4,af8f827a0c,7a5179eecc,f7a18611f4,bbe8e9531e,c006c7e3ab,13ffbb2f9b,5e7434f45c,7cd0fc6ee6,982d3cec0c,e5d97df386,d2ba2144f6,e5b84c89f6,3e8e40c0af,59d98c516f,2e094b4164,16477688c0,e42932b7a7,13de8a510f,859169b381,25cdb46d8d,230d8358dc,9a692cc5ec,eb0afd9050,c8dacf657f,5f220b4a45,92719fe0cf,ca4264faf5,4f1a55de40,f953f70b91,d106ccb1fe,a5e7c00244,be9b7607e0,4d6723e5e4,26f8567f25,cc6a778404,11c1eee0e0,bbbf7a6412,04a9fba2f0,33a28bc4f5,a1bb216b2b,985604c2b6,7e92c11499,c762830741,17f29b0731,29a8825bd2,a87b3e348c,4311902217,201cd0cd6b,067d83642a,f526795c95,fcbbcd5a59,100a07d1e4,0b4bd77cec,5eb67f9f84,029f33c2a6,df4ac41625,e2284dc3b5,0af96a8ed6,198becaf9c,44575cf5b2,b4942fb4e8,bf8348b410,ed12eb2000,1e6ed65d77,9078e43e36,e0cf52185d,3ed1f621d7,57d59e2872,04e027e499,11d4041795,c9bc072f4f,c9b82b90ae,6dbd0f28d0,9fff3bcb10,0a7a27bedd,2764182d02,7d6e18d0ff,caaeac3184,5943be120e,32cdb61919,7edb360f06,2b4b2eadf7,89e8b9518d,ccefcd9140,9f584196e7,1501284e7c,2374d91794,4d1608c849,19e0f50bcf,6e23af357a,a457e8f04a,ff2a8a3987,80415b2524,bd08022e8f,2780b8eef9,2b2961a431,28d79d50ff,8367cd66fd,3322532d85,8c59ba3892,6ef49cacb4,1c42ddc028,bbfcd4160a,ab0fcec08e,405e6e0273,913a53d7df,c633eb52f6,77af778b51,652f550162,9f925cdc4f,edb2cd3b74,add0b88739,a47a2e1872,6a7ef1ed9f,3cf083c282,b89a199ea8,96f16e9290,ddc5177b92,ac800699bd,7969bf2d3a,545a20faf7,38c09b5448,70d16cbbf8,3d7eb3d3da,c886ff11f6,d14a7310bd,12ea12eace,5d5bddb577,667b9327cc,97488fbab3,5b3d7e7a15,31e06f7d89,c6f556046e,20f65c2867,873ac9ffea,f59ac0828b,2daf0e6c79,7ca0d70191,811eb81b9d,9285827b80,ddc9e66919,4d88912fd0,cf83f0f982,725fed9d1a,238a314cb3,76f1e41c7f,6c87f68371,88b2072e3e,0beca1c4f3,6011d7a8f3,8a39178d32,6e5f6170d4,11a62c2341,1272dcc42d,dd1b3c312c,8cceaf5c89,c010d58925,06deac5b8d,0636355505,3b066804f6,c40dc72b02,0e895c323c,e5c7ffac26,948fe603f6,6a2643bb29,d73d3e7a7e,bbfeb74a4b,67905ad3cc,d8198efa36,8027d59e0e,310ff20014,d6e28ffb3b,56681010b7,fd8cc779bc,cc2585df74,74bfa7c8f2,164cf1ca83,c278be9e22,e0f167bc84,23c075a035,23ebce72c4,5694d08a2e,37290d74ac,1fe75231d3,b3a1984ba0,81824c90f8,74284d9dcb,881d5fb600,6bd1454e48,9c19636dde,8e9498bf9e,7e002e1ba0,92a5dc04bd,f168ccdd91,5359565a1a,85ca6d6d29,3f267c2ab4,3db20e1df8,5a638a128c,2181584795,0fcd568a5c,61b0a3c4d2,03fb94180a,c34045c1a1,d16f06fe25,6f5a6034e7,f39fd90734,0d45f5fd46,63b0490d47,15a596e3c9,9f82f7b375,69e399851c,2990bbc26a,aff64e4fd5,6cf382fca2,a908043ed4,42e20cbe94,3fa405a830,4e629e9dbc,94f94c9c97,b1a704873b,355543f790,128c2622f5,2c6ac23e4f,cdb2e0d0f8,e659dcb12b,81a60f2038,389ec5f111,f3a22c1ce8,ecc4873a16,6e8fe47020,9cae07a2e9,1134e4f4a1,54bd8ea967,06df90ccef,db113508c7,375676bd26,b3986952b1,39d6238be6,5b4535bdd7,26dd7517f5,b4ca32d7b0,fddbb38a8c,6b653de4dd,b12a020b7f,daecc0bd28,58a69b8bb1,60a0f78b50,4f3c4172a4,f1947f79fd,c6171781d6,928ae8cdaf,a9e7a8af89,97b0560280,05e884950d,80c1018a4c,d0eae8d194,6cdfd271da,17550e2bb9,c501935a6b,6fe8ecbc1d,6f5a5c61cc,1b0cf192c1,2c371c2ada,123fd666aa,86a67dde02,af9d2c92dd,4ed28f82ca,8326e09ce4,944c27e5b9,f96c94f287,6f7a9000cc,27f7340b5b,59cd793c05,8745f86640,5589aa5863,fd5f8cbed3,567fa2572b,b2dc971f48,acf5bfd986,1b0b7e51ee,ecd38f2608,98c73bd75b,b308a7f43b,6e16db1022,fa2dcc2381,dffc177fd0,5c92df56de,4b8d8a784e,f62e610834,3026a0ca48,a43ac7b069,d05c435436,c3b9fb78a4,ded32129b0,00652261d8,46023b2bfb,c52028f34e,237ab33658,a77de8a6da,49be417ad7,e7684586cd,6f61ec5c7a,9c0211c51d,cfacfd3ec3,947726dd63,263a4dbe41,2483f281f1,2c20a6b064,2144607a0c,81c9d6128b,1d7fe146fa,e1e025805c,f83cff8066,a36c443337,599fc58fd0,cda3c373f1,dcddf1ef3d,6ea607f9a0,dda209044a,300908b9d3,d15690f08a,c3838a8256,67656def00,5b90071aea,b8e8c313b6,edcf27a66a,5880072b27,4dbaa58669,dfbb889cf1,63e6ce93e1,3edab1ff7e,895479bfaa,a6b2aa4412,d810e25239,72f4be89d6,43cc23fa52,cd6357efdd,44c3e574da,532f011ec8,f2ff83860a,9b3e227823,d22f115abd,07a7c43357,2534e2de1d,daf81fe964,2ce06a9e7f,184c926681,7743ce348d,a9c43be948,87da8bbbea,150f7f1e56,50f7becde4,30fde358b3,5b612edb57,0b7a461fef,b76419d9ad,218ae6b449,66780f1fb0,7062520c5a,d90ee9ccf6,2752a2b544,b755cb248c,2d2370db24,ac996ae492,ab906be12c,76678e40cf,abb3270111,ccb36736d8,9bb09914b1,9a283fd012,73c76d56fd,0ca0c5ea4a,e73b48f750,f408830bcc,cf07a76f93,7b74b418a3,fdf9c202a7,6bdb262b02,97c10efe01,092c79e8f8,8d45d1ea84,6fda2b8252,a1cb100f57,262121c537,f98fa2c084,a4f12c3895,34707c3f40,c195d2d875,94f106e011,6e85ebe745,4bad2eaec5,44b3c5003d,b4c3858f5f,4459292672,cd08c4c431,41762bcf88,1a80b0691b,7dd530c4d3,8c941bffd3,3ff2fc28b4,3962ce683c,15275743f9,3b9c4346fb,b0688a56fa,b823c439f9,2e1cfa82b0,e97166b545,267be576c2,361e48d030,01c3ce440c,60777af12e,6610cc5524,381cfb6e1e,c1f1005e99,fac6a3243e,ed9f6f2506,2cd6f936b0,75fba329cb,4e1022fda3,6f6465f9dd,9e7ef9e260,53bcbb9152,27ce252594,e08d706b3e,260b27ca30,923fe53966,4c503ca677,7e414e6ac4,f9d6cd1ed5,26f963c92b,49eaab7e75,5cf46cd895,3d3eb7dd21,d715cff900,ca00fccfb4,df2f18f63c,b3140286ac,4231a97ecf,092bd8646c,e62377847b,b7679dfa95,b40a48df0d,ee8250fb76,b5c1fb2efc,a04e52d895,b200897121,fa79d4746c,50d858e098,ddd36ae5e6,ab27b729d9,81e1c7698c,35443277fe,b76c1db1f2,be6bdfe81e,f55101cb5e,3592f48abb,2cc7e7e9e2,55ab75d85a,7d68838bdd,e596899f11,d4d6cb9991,d78de925a8,77f2f03672,b2dae5aed5,0818ab2593,f3b96e66bb,008231aaf9,bf0bb4ee60,c8dee78f8c,47c215b5f7,0fe77a590f,ad2a542c84,0282d9b79f,3dbd9cd5e1,009978b8c2,4acfccfbec,2b93b177b5,2dc46af1b7,fcbcf16590,b4ce4b23fe,d34a569ab7,79b1bc8131,e29a7f31ca,ed541aab68,5292f27501,c8cf701f30,309d267f08,be07f5139a,79e216f9ba,88a1881f00,4064e6a9a4,f1c562eae3,1ff3a3c183,2ad5623197,53e2975b5e,b74e6b8e73,b80cdaae9b,c8bc2586cd,116c49130f,9f165139a8,87346eb282,8ffaaf97ad,e7d3799ecc,1e44a1c453,fa95e50808,77c3e615d7,d778b67371,c0d2856b74,889393fb69,3b9c358f36,d0607f7ad2,dfc3376b82,2443630b46,e6640de835,d14a58bae8,400b181c87,42af43e361,dc9f28b12d,3f62550731,a7937b64b8,b65bf95cc4,b474a99a27,da4270e373,9ebf9b5978,1c6e6c4c02,807d0fbcae,bd9dc5f78d,851e43bd44,5dc27af287,b5d2f4515b,d15a1edfb2,03b6b3e916,4e44889794,76a7e234dc,8a1eb3d0b3,a3e1f4935b,c06b0cfe0c,5e0502adfb,f56175f211,f4debdb7ab,8cc2cd7978,c51faa1485,b042165460,66ced6dbc0,255541b1d8,a3ce0b6106,c1f026582f,22e4f6912a,32500d7500,619a2ccf12,babc1bd8ec,8d0c7ac992,27a0113e9c,4eb41a2a9d,9dc08e4033,d735fb5e9f,17c3a32448,bcc649cfdb,776cb326ab,eb8771659e,9dff50df08,403b8dc9df,d098ab5e44,cde48537ca,0a51ea4d84,74fa5327cc,2d8d693177,d7bf0c9ea6,426d6ea425,ffb304816a,9209526aaa,acbe4bfc77,00c4285274,b22d1d8fe5,5a5770fe3a,f44a052a0e,ebb3de8a3d,4e5aa69aba,66dd231bef,eba4ae33f5,ce387d5e0a,6ca5cab77e,54d5dbf012,21b747de22,795b6904e5,23eeb69c68,41024084d2,7a8b166e62,2fe840e132,1ac7f69ea5,c974e17b8e,e9da0bd78f,a90fd9a9a1,b8b0e7effd,0feae16d55,9ed142d60c,4856d20b49,dca13388cd,dfec224737,6b1243a894,ead6ef03d6,0b132ea2f6,a1954b15a7,c50a11249e,08ddff4ebe,6bb7e06744,431ba1c693,0895a532e4,c6aa1595f7,e776a07090,28574c1e43,132a1a391c,e97c382099,62c4ea25a1,d2a1fc0432,910ae82580,409a14887e,4bc529d33e,d27608cca9,99552de999,5480f08f35,8db049dc81,24d7f03d8d,770e607624,c2d37dd057,541f42d754,61814ec78c,dd73a2f7c7,0acb4d236d,2b447a850b,234afbd5f0,e010fd1ce1,2c2240217b,3492ad65d0,0f78fcc486,f6cc5b085b,d4e3fc7b04,87765da6cc,ba4788b226,0f2a693e93,63145a8fb4,23d7702598,7aa5eb472a,ad936fcbed,adca514641,e11886944e,a9d4034da0,f1abe1b083,83ca68be62,bde7dd741c,d081f5e402,3eed0f3329,e326cff641,09aee23b1f,4dc2159bba,a11ae06469,3ef81cb18b,12e1d34b00,1b001706a4,489f719cad,c1d64b2d4c,ed5465b922,bd878fa229,d087ee8196,18e1dd3921,193c45b528,0139bc5deb,652607e181,9f2e6d33a3,62484e22a6,3cb968a982,22d5925ed6,064a43832b,39e0f5efdc,2cf24dba5f,115584860c,106a5842fc,d44a08de39,ae6c79d10f,e564b4081d,6ef7c9b15e,f77fcbb21d,b80e0af617,dd805812f2,bf90ace460,259aa8ef98,0834a044f5,308738b819,e8b22d83b4,39ee455197,81c16d337a,b21b17b4ec,4ea1405881,a55e2e3846,2314555c88,c29277f55f,9543098f17,9e96274abc,fd62862b6d,8afe3c83de,4740ae6347,8d53a3e367,9ac0add475,7c8b29e7dc,08d33503ee,5e580eee1a,79a5478768,851d3fcf9f,c50a5e4de8,97fe8a3749,ca4176138e,18c3bc28bd,b441e730bd,f6002cbceb,49002d515d,9fee8f88b9,0deac0a26c,4cb0b250c6,c2d4b446a4,ae0a9ad322,0f780b5c73,4fb6234885,5f0af51693,c426a5fe61,4e73ff840a,6f4f1b1c9d,6105d6cc76,003c443ef2,07f3378112,808a374d01,6f61f46c23,0734bf93ed,2b35ed6944,d490624d0f,1cf6e72a3b,c0cbff04cc,00cf141f88,e20a548f23,1bc04b5291,4932c716f7,0fabe40e86,14d24f98ae,c81409883f,5389d89891,ea07dcc807,623052a3f9,035300f3af,ac1b5c0961,e6f2ad8146,a945a02a04,6f029e8011,33bf6fbd7c,4c95538022,c96c6d5be8,84d7466427,8ea748b09b,db7304319e,106b086224,1cb6508098,1e142e6277,e6d7ddd8f4,828408e40d,6b847a0ed0,5c417c6c81,5014f9af3a,873f8161e2,04e9c0db87,28cd2c5c15,014aadadff,4a502846d0,4a33eacd5f,c679da09e3,554f4d3daf,fa5bf879ac,0163f1eea7,c301f75ab5,b2f5e2e217,3eb874ba01,22d8ec27fc,ddc6af1a32,5e8c990220,5839321603,a2fa4cfad0,cde56892bb,b113405b6f,10e86c6514,a5ad895656,6bdaf554e4,91ed2ef15e,8fdd880f09,ef875a1705,b2c66dfd45,4a3484b3bf,7471bdb176,6ca7ea2fee,0bc3a5ae30,2c70e12b7a,0db10f2c2f,5c77d7fd8f,1df1fcc3cb,0b27c158fe,6038ac4d78,89d19d6394,cbc8a597a6,3171d89ad0,8e8c7d42b4,5897265940,1a5afeda97,69ef5a88b0,3d4d101cd7,3922459741,cd1bb3012b,a51146d380,1aca80e8b5,3236c2112d,5605a516a7,49547872a6,6f021f0268,c98e85f249,a4ef304ba4,5eec0dc419,d35c416a85,1d9283d848,84cb65ccd3,31e289f536,ba29c6b70b,5ed45566f2,8f1f74adf6,8b3e27a4d4,b85b91c535,dac1d7cfa9,81fd67d02f,4d5b660943,9f91161f43,6a8da52e92,af193190b8,6bc636ff01,360f840359,c7c8fc91ab,a708df92c9,ba29297b6c,00ed6c583d,f464d7d71c,5d59b2b967,0f82aca66a,812b9215cd,359f7793cb,b78e58750d,f80105efab,0081779c28,30e9190d7f,f41f2c785e,b718f1354f,cc1d3b0234,63bd7065ef,5364b92e50,99a7026172,cab2644828,81b158ceb8,55ea09e571,b1b1bdb480,fc59487712,42110162e0,a330395cc0,180ca01b95,247610f4de,b95cbcfe0c,0cf67fc72b,472bbf1492,a2e1c40da1,25bf8e1a23,0c03058694,08e4e1c34e,1cb0f5a9e3,fc66f021c6,254637f72e,be7f94bb10,db1a60bbff,67d3e22ffd,686f746a95,cc03f402b0,db9fbddbd7,f59e7a4ed3,b62a51a45f,9738b6bf3a,f3bb79e48a,dd8b20c25f,9dc181083a,bc020a35b7,079cdc52e6,3be7a50548,ed05dd4d06,773106703b,00d8d3f117,0d6e4079e3,6558a6a337,d05aa2a15f,e645af8e0e,48b676e2b1,1812294248,d959b63866,6815f3c300,30de4f96dc,36bde66f28,49ead2b106,a9dd98f82c,fa75b5c25f,34e39f662f,8fe26efbd6,e4d693d24e,cf929d06a4,48bf9b4f14,4084a32b9b,fc613b4dfd,4945a70fa7,40b30b4e8f,58a6d6801a,6e00cd562c,57523f642f,8a64ff0988,0d0e43874f,6d02f7d61e,82523faea1,1501661682,59d6d61431,6c8a739536,b23a57f108,721c9525ad,2db76f2152,af45b9700b,e31ab643c4,c064fbca9d,68b9c231ac,398991009d,4d51fd998f,283128acef,429bf78dbd,fc261a5e3e,d30ca7a7a3,ab530a13e4,03ecab669b,5b7e6bf2dc,a4888af4e4,35af25f5a5,8825e76530,c8ce96a5ba,692e51978c,1c48f6310f,692e4e5dec,cabd786ac5,28cdd20eaf,04e84b3a86,0015476163,64407f4d33,80688fc3d5,1b34ffb5e8,2f907a6de3,3f8fee624f,58c92ee653,d524c1a081,9372c470ee,9106d6212b,bcb9dae6ea,72110207b6,7de97367c9,000c285457,beaafa510b,a5c7d1719e,9e78b43ea0,6d11e92bbc,187897ce0a,c23b31a017,d19949c3d4,cf0622ef2a,305238273b,0298385632,3b80d38f76,47c5c28cae,683a62ce15,8a6ba32c9b,543b1c4bd4,baff4fb62c,d7fadf9f3c,0d31bc618d,db875b25b0,4919063719,5ef2c394d5,80f189984e,4137b01e13,8d8752e36f,e06e309b66,4f0d9e5f2d,b50b9b3a45,1ec5f4127c,82a3537ff0,9db44611cf,5eda958e9d,e2271fcf39,7400ec1250,5697abca7a,46ba34770b,f14896d8de,be8dff00b0,09f04951af,84e0c3d153,02566ed5f4,f1004e926e,5a1c2d155c,75ef2e329b,a08a0fcbde,3009be769f,7e2372f411,6497e4b3d7,19fba0e995,c6c1c9a9c8,e186022d09,176473d731,d3a61c6844,efe2a5c09e,fc7fdf972e,49742b4b8d,317b32c143,dc365e79d4,d77e22123e,6adc722e54,edb4656242,1785cfc3bc,9368a7d21e,f2110e6cf9,ed5eb9a37e,901ad244ed,12886f9d00,781e5116a1,7dfd8928a4,df87764540,d3a4871f64,2958d416d0,1f1fd1804b,771ddab9b9,74e892c911,cf3c3437a8,81dcf73d98,def696de03,47afad612b,7aee5b5dbb,2e180d5acd,b4dc66dde8,988180bf0c,5cc3f82838,93c68148f4,ab7902bcbd,6a581ee901,cba06b5736,fa65983171,d417a32def,c266ada2b3,200651a8b2,7692c3ad35,2889716716,f6fc84c9f2,f905b19542,2348f99874,f79926c01d,4379105aca,26a0ee5c65,a11a75e0fe,1b4c9133da,4fa1a13ac4,68566dc699,3eeb7e96e5,03822375f2,e0fb6e6c63,ded579862d,0682c5f207,88f6811ab5,b76196e000,d9298a10d1,7f472b2f29,560e3e12b1,e0ee8bb506,31207a2065,3fb847f1d0,4908abbcc9,5fb6a47e36,5b3975651c,4c1029697e,b982a09b35,f08689f14e,bb2bd7ca4a,998a13ae02,a2afeec49a,3660315a9a,47d8bd4687,ee2aa44805,f5afa2b377,a7cdf5d058,320e00e73a,79631cb1b7,346793476a,382635c932,cae1afc123,e47125968b,4d3971de62,4488b8b86b,1d0fea39ec,d74ff0ee8d,a4895eb44a,a0af9f865b,2295ff7a8b,e87f314e6f,1fd38d5cbd,6210c0bf05,44e7d4d9ce,040ffd5925,c2e10c20bf,5509840d08,97cfbe8753,757982d777,a1a14393d2,e21a6b0cb1,debfc54303,13809668fb,c9022680f8,8cbbcf29d9,fafe97f7de,85441a43c7,38a81e87e7,bbba57318f,45569da57f,55c64d0fcd,c00062f7ec,4b60d190e9,1d78e018e4,e878b52195,2cea274d0b,34235a2c50,f0b8c9d84d,9f79fd6cdc,e3127a4ce1,07ae38b93d,a67a41c8bc,d3768aa924,4008294739,a00f29548b,4502846f2b,9ed1515819,81df63580c,cb5815fe5c,72f7c894ad,3b56c35200,aba4cc9b8a,56ccc4dcfc,9dd7dd2209,eac8744624,0daf0c9ca3,81dab76012,6449cf6fe8,7ccc804f55,251fecd592,f712d322b8,b9425afde1,1366fac711,4e7914b0df,0363f1a98b,27cac55038,2c810fd034,83e01dda3e,5a45245950,c4773daf2e,72231043bc,e91c254ad5,0c2f83b433,d84afde29c,e8eb8741d3,07d715edb6,ada750e3f8,154d763b6a,8e9afe9d1d,472dc7749c,45666d976b,4d4c7eee2e,77049f6f88,b4d5a180d6,683b531f41,470664bd59,986a1b7135,ce953a0eb0,3092a5f0db,4d591b76b7,715dc8493c,72a7a4f82e,47a4935672,19ed40bf62,1198780b3a,d23be8d114,1310ca2c89,244210e484,363256bd15,c1cda26362,fc9184134a,1f2a767d75,680dce633d,d069c85283,405abc33f5,efa1f375d7,910daa97a4,c5f5571c2c,fbd51a2151,41b589ea15,ff48e511e1,e4d916fa9d,074f370625,6588ef4db6,7048dc8aa7,6007b44327,81b06df430,4566a3eca6,d107ea3629,373cb2c6d4,d4fba09b85,22ba2d6f28,acef2c15bc,8fb7cf7a46,16b60e9de6,1f5087db91,22c72aa82c,8577da2ea5,9d98ce221d,6327245c3a,d37d96b42a,715c044649,129ce50dd9,8e9d1a8d5b,ff2e963ff6,aa3a05d9d5,fdf0d7533a,319b44c570,e49b5c7a9e,afd5c5ae57,f7d9f5a904,a1d648cffa,a441b15fe9,2269c0be00,7ee6118994,50270c12c0,c549779d79,d1ffaf0265,092cda390b,d7439bee24,9b4f1d0e11,b24d6d3373,aa33996d60,8fcfccf675,52a39733bf,cf44886e54,2ed6b4c1ae,95100519be,e1d8e55233,70ce871f8a,ef5988103d,4c7e98bfa0,909ca0096d,d164ad30cd,5fde095c47,c697d2981b,d5259acec0,667937c3e7,084e990a49,51945df720,a4d451ec23,ea6a344e27,b1f7124c56,fc2b6c264e,35379d9c00,efafcd967c,7e5608ab61,887270d0cb,a36a2ce180,0e9fd1596c,2df3bea2d1,a1a14ff4aa,25e2b6b106,7ab3778776,845e918313,c4d0cf241a,824ef78741,d5393b4831,7e3257a014,5de95319f1,a9f4b3d22a,f6a214f7a5,9588c4b2e8,1a076332aa,7187f0675e,608af3ec16,419a636ccc,c97ace4c8f,7696fff84f,add8bed82d,b39e647572,affc35bd6c,209f76418e,7baa68f241,e049bd056f,409e364456,6dcdffaeac,27042f4e6e,4bab36ce40,16b9745831,fccda8faef,591b66b117,2c6ef0f0d0,7920fdeff9,1db147fa22,5f5a8ed8f1,362a284952,52b5cd277f,18d63be10a,3f650dce81,c58dd0a376,23f7c8c887,d1a0d6f470,d70f6838cc,1f1c5b2fad,618d663af0,299bcf54c0,f811eb5c56,a97b093173,8a84e406c0,aa43038afb,058ce9bd95,1a88367105,9fdaa7ee3f,7369949b47,acba255121,ae679821f0,d359e52a5e,45c9a6614f,ba08dad18a,614bb7aa0b,8b3369944d,d0350a6064,c6c3fa689e,aeaa2cec33,1a26b7dee6,63479ad69a,94497f9309,0967115f28,af2bdbe1aa,f79d7d2455,7688bd7c42,da2876b3eb,549ce58984,30caae2fcb,157dca92e4,a0b967fc60,f469802a31,59ad1b2fc7,ad4c527da5,e1f92433f7,4f48f7207c,cd89249445,d64debd942,790fad4744,493a15e7bd,631ffa50b5,3608e4bd0e,b0cfc539e4,4cd6c29148,21a0270b7f,e8927b61de,4a69f19c8c,2419329067,8f8e24f65c,5d2c13d6f9,16367aacb6,2bb80d537b,3fb45623cb,5d2d3ceb7a,19b25856e1,cbd345d6a2,03e71c6d7d,b1a36d25d9,c0f21d4514,b246cf89fe,2161403032,5146f25dc5,821119d79a,9cda38ea3a,9df6b026a8,3f3af1eceb,6868e83de3,8fb6d5f37e,3ba8d02b16,0bb09d8060,a6b1880837,91d80a4942,c3bc45ac35,2f3c3e5cf3,ce635c4eab,7c05112240,072a626ed2,ecd3fad7a4,6d7cbfe8a1,e5d5b97113,d24ffcc6f0,74cac794ae,efda1c9252,bd9b8d8e9a,8d9001d32c,f9b0078b5d,89f45d4c81,cb91f54317,42a73cf9f2,3b2c1b5052,8f30a852b7,9807eb6ec7,7d10de8554,3b04837881,ea7bf4bb72,d94ad71595,b991a49b1b,0b6f395ca1,5a9b9fc8e9,f2c819b679,30b8795437,78cde64c3e,00a9e08ce4,a7a39b72f2,6b5a3ded01,6342d0648a,dae735d957,1980d3927f,b396cacce7,44778d8236,ccdcbe846f,0b22fca0ad,f416b363c6,cf659bd3fb,9c53c074d7,2a0070d014,3abafce5bc,8c1a64a515,5643f1a80e,8e6a0ab293,0afa5bb5d5,a1557604f3,03fdb065d9,b8a7e24e95,5c7dad260e,ebe4136fc8,c964454ae1,6558838331,5e0cf7bd1d,c8ad3a2c77,81db8ebbbb,544e2d6145,fa1eadc4c6,04d588cb41,c0f1779c16,ff488ab873,538d7d9fe7,1c27324f01,e5f0077dc9,a746222f09,736bc2d4e0,8f27f432fc,3e860f41a5,06efe37f5e,a4cf5e703e,f5f445528f,2bfbc118ab,e0c08c2b1f,4b3d4a0dd7,8270f28241,c14cdb1956,2a59d59e38,63f75c890b,4a754148b8,484aab2f2c,646964943f,ae0facccf0,dd29442dec,9014fac818,41cf6794ba,2daa8d4a05,3f49dbbfe0,cf2d970673,b9e998b692,a04afb368a,21e5205f73,7d4c5c8894,bbccb9c002,8f4a0aaa62,f64a33ff88,0f58b78bc5,58e989955f,9bfa0b50a9,798552d392,a5a2729ffa,a68999add3,ad1a64057f,af1c686bc1,13d853006f,7f480e744a,ec450786e2,be2bdbb310,e28b3a396b,909802b269,622a494d3e,57d4aa3772,4ba3e8e376,b11833a439,960a38ace7,f379ccb92b,dafc4889ee,1562206543,c7ff6dcd94,0eeea780b0,e0afcdbf6a,d37a24b801,cced28c6dc,4ba69735ca,39be15289c,aff0f313b5,b86262f9bc,919a11f948,3e64cc41cf,b526aece29,8f53dd914c,94e8566ddf,04695fa805,08c4242b5f,d5a0d90574,dc3d50da8d,b04cb09fab,c478361e68,5dc60efa39,73dff70e25,6008c26f44,7cd58cdd64,eda15ce483,72b268f826,264c8c381b,35bafb1ce9,56648f5b0c,cb86eb2d91,a9491f4c1b,75490bd7b9,9f3a4329d8,aee408847d,a5c935d142,1afa3ca6fb,4cf14180a8,cc767fb1c6,dc726d0a52,21839e0eb2,e83664255c,27756f050e,c2333a7e3a,0829103205,73d1b1b1bc,f30dfe1cfb,f8f474a55b,c0cafcf0e2,763cdc62a8,41ef29df4a,0832c0adf0,ee48ee67db,811f2a14b9,982776aa0b,07f5b83f6c,7276e0a742,d83a900c42,da47c2f450,44eb92b463,3ef631dfff,b9043c16af,a33603bf79,d493f88691,2da977e917,78b49fb2cc,a44c47b1ee,b76a7ca153,b093720ae2,b1ac925abd,bbc5e661e1,0d4fc4a78d,ceab38a5be,2a1073a6e6,0c62f876ef,50cb3d0008,ce7611e748,281a37477f,8ba4ec7d63,34a04005bc,0ebb429fa8,814e6bcc41,a4c71d043b,12796d3d5f,eb0b4270ed,ca8b22d0db,879915cfdc,e4432baa90,e9da86d351,f1996a7cda,2a9810cb71,599f770354,9f86d08188,982d9e3eb9,e67fd73a84,8e7fc0236a,3cb8201e7f,21af6f1260,f4397b4805,e244f187f6,151e58a831,5de94d691a,1eb7960241,b8192353a3,8b5b9db0c1,8365f8634d,7b0456581b,05eeec2d70,49eff747f7,1406942915,8a28929ac7,f15c16b99f,2b63bd1a16,5dd46878bb,336074805f,8950abfda7,97380187a8,c405760daf,8ea36b79cf,aaf2320646,a60ec1cf58,da43f06caa,e0f4f767ac,d142bda3c1,6d0ef3950c,0c24734d7b,74f7fd1cf0,3c469e9d6c,5ed728c2fa,bafd151a86,00cf4ce393,b2715212d9,2769fc2045,7c9bbe5ec9,9722d4a4b5,28720365c5,23d611a6f6,dfbc0774fd,37bf51bfba,83716a3551,224ec67c89,35319a4202,11239872d1,b58951d8a9,cc58a5f898,ad2015263f,50ac81f970,0f53133ce5,2bb8bf7259,276446ba01,075f4ab854,2b6c372eb8,116f54c41d,27f576cafb,11ba658522,e06da30434,0209442e11,ad9a0cab12,a5075550e1,dc9c5edb8b,2ab022d820,79891e9807,d22f4e0f27,f39d5149a4,683259feab,657c97bf2d,34a389d790,b39419ef79,7130df4335,24611dec0a,b5bea41b6c,4ad71f67cf,b7dfa266ad,f796e2f28a,c5c4bad89e,1e262cd7d1,05cc6c650f,9c6d86c439,fe8c45af02,32d6e4a20c,94a35fdc30,8d7d5397f8,9b473845f6,74dd730b5c,d1a749ad87,7c2c4df740,dc8ffdbf27,72b33a1cb0,72554af938,3fc4ccfe74,1303c06b0b,9bfac98c5b,72de275ac0,2974744982,913f2664ae,a5e7591128,3107ea0301,1f7eba348f,d767748a60,f015346ae3,4c50bb40bc,37214dd6d7,2e95d0e38d,ef379363dd,c2720445a4,385cfdbc00,327a7380d2,b23a6a8439,787600ebe6,2e3200de84,dd69347038,02ddbea2b6,2937013f21,7fef9479c8,a9368b0df8,261b09ff8d,aee6105582,8b2f406339,e5909c3cc4,f7ecefc770,0a4e4c2943,a3b142af6e,f839161355,a62ed7b95a,16a41d9ce1,905301bf73,57ffcc28d4,4c23c3188b,657fdc2b22,71cac08484,ec654fac95,627fd3d05a,c9af477d19,970b1897af,93ce248b8b,fb7ae694ba,1d35a94841,375eca5944,e6f0a1fbb4,b404ed3c37,f4c44266a2,630ba09448,352c00e4c6,e622da235a,6806f86a17,a12dd3a7fd,5ca4f3850c,4c6a4839f8,2df5712e1c,d133a66dd5,1977d46c03,e7be2c21ba,f792bc226e,21665ca201,0cab1c9617,2bcb43cbc8,05cfbe2833,887d814b06,00e3e584e2,e2efdd7db9,2898a07b2c,e759968ca9,f0e68ac26d,a5961f3f5a,39ca0c269f,685ee53b55,96a6b83f14,c57d7e9201,445be54d48,06612c2832,62d7a6b121,ab274474a6,763268b8db,06aca62677,baf6a0b70a,716ecabb45,7a6c4fac6c,4d8aaa64f6,3748fbd132,8656aa55d3,3e3a62b8ca,0f0aa408c1,ffb2910328,476994559e,96e7268d88,0bb5e9329f,0f4168490e,4b125ec99a,44c5e7071f,739bf484f7,c68fef1aba,c47fbc5d87,1349d5e184,e5e72beb4e,4b5e57f6eb,afd1a8fffb,1197a20df1,0728c355c7,280d44ab1e,76a796208b,534c51e177,a5d2ae286d,749ab2c0d0,de6c334339,ba59926159,15eaa75240,b48111c10c,eaeeef0170,ba7955598f,0abaa40b10,dec0f004ea,9d52a3c8e4,7e73b026cf,bc16f5825a,823a3180da,44ff7b02c8,32c4feed99,c047caef95,43e26a97aa,4221a0fc3d,30c5461fc2,9b2abfc29c,7c68b70cea,c88af1b793,091e606752,ba1c566a4b,f76b61b962,cf2e5bff1e,36296059cc,99f7855eb7,feb672a2e6,98c1eb4ee9,00e13ed7af,486ea46224,6de2f53e03,c0a6eb55b1,f0a289923e,7e4353d9a9,4ff366d40e,e3c04dfa6e,10fd874b68,8810ad581e,7ae4b7c767,4cb4ea2558,c685a2c9ba,bb0347a468,dbba921ce2,b5bdafe95d,676cb75018,f9194e73f9,543e33c48b,24fe93c9e1".split(","));
const NAMES = /(^|\/)([^/]*\.(key|seed|pem|mnemonic)|keys\/.*|[^/]*wallet[^/]*|\.env|\.env\.[^/]*)$/i;
const ENV_EXAMPLE = /(^|\/)\.env\.example$/i;
const PUBLISHED_GENESIS = "ca91e093bb8de33e90db52d7c89876597d14760703793ea7211929e73e613062";
const PUBLIC_DIGESTS = new Set(["a7ffc6f8bf1ed76651c14756a061d662f580ff4de43b49fa82d80a4b80f8434a", "3a985da74fe225b2045c172d6bd390bd855f086e3e9d525b46bfe24511431532", PUBLISHED_GENESIS]);
const HEX64 = /(?<![0-9A-Fa-f])(?:0[xX])?([0-9A-Fa-f]{64})(?![0-9A-Fa-f])/g;
const FRAGMENT = /(?<![0-9A-Za-z])(0[xX])?([0-9A-Fa-f]+)(?![0-9A-Za-z])/g;
const DECIMAL = /(?<![0-9A-Za-z.])(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])(?![0-9A-Za-z.])/g;
const BASE64 = /(?<![A-Za-z0-9+/_-])([A-Za-z0-9+/]{43}|[A-Za-z0-9_-]{43})(=?)(?![A-Za-z0-9+/=_-])/g;
const BASE64_LAST = "AEIMQUYcgkosw048";
const BYTE_GAP = /^[\s,:;"'`-]{1,8}$/;
const DECIMAL_GAP = /^\s*,\s*$/;
const NEAR = 80;
const HEX = /^[0-9a-f]*$/;
const PIN_PATHS = new Set(["finality-pin.json", "examples/finality-pin.json"]);
const VECTOR_PATHS = new Set(["labs/vectors/offline-vectors.json"]);
const SELF = fileURLToPath(import.meta.url);

function keysWithin(value, allowed) {
  return value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).every((k) => allowed.includes(k));
}

function rosterShape(list) {
  return Array.isArray(list) && list.every((m) => keysWithin(m, ["id", "stake", "attest_pk", "root", "root_slots", "bond_address"]) &&
    (m.attest_pk === undefined || (typeof m.attest_pk === "string" && m.attest_pk.length === 3904 && HEX.test(m.attest_pk))) &&
    (m.root === undefined || (typeof m.root === "string" && m.root.length === 64 && HEX.test(m.root))) &&
    ["id", "stake", "root_slots"].every((k) => m[k] === undefined || /^[0-9]{1,20}$/.test(String(m[k]))) &&
    (m.bond_address === undefined || /^Q1[0-9A-Z]{20,90}$/.test(m.bond_address)));
}

function pinShape(text) {
  let pin;
  try {
    pin = JSON.parse(text);
  } catch {
    return false;
  }
  return keysWithin(pin, ["chain_id", "genesis_hash", "roster", "epochs"]) && typeof pin.chain_id === "string" && /^[A-Za-z0-9-]{1,64}$/.test(pin.chain_id) &&
    (pin.genesis_hash === "" || pin.genesis_hash === PUBLISHED_GENESIS) &&
    (pin.roster === undefined || rosterShape(pin.roster)) &&
    (pin.epochs === undefined || (Array.isArray(pin.epochs) && pin.epochs.every((e) => keysWithin(e, ["epoch", "roster"]) && /^[0-9]{1,16}$/.test(String(e.epoch)) && rosterShape(e.roster))));
}

function vectorShape(text) {
  let v;
  try {
    v = JSON.parse(text);
  } catch {
    return false;
  }
  const top = ["chain_id", "genesis_hash", "height", "epoch", "rosters", "certificates", "committees", "chain", "committee_roster", "addresses", "registrations"];
  return keysWithin(v, top) && Object.values(v.rosters || {}).every(rosterShape) &&
    (v.certificates || []).every((c) => keysWithin(c, ["name", "roster", "accept", "verdict", "header", "certificate", "base", "at", "remove", "insert"])) &&
    (v.chain || []).every((b) => keysWithin(b, ["height", "epoch", "header", "certificate", "proposer", "role"])) &&
    (v.committees || []).every((c) => keysWithin(c, ["epoch", "slot", "digest", "leader"])) &&
    (v.committee_roster || []).every((m) => keysWithin(m, ["id", "stake"])) &&
    (v.addresses || []).every((a) => keysWithin(a, ["text", "accept"])) &&
    (v.registrations || []).every((r) => keysWithin(r, ["name", "tx"]) && keysWithin(r.tx, ["tx_id", "from", "scheme", "raw", "signature"]));
}

function isWord(token) {
  const word = token.toLowerCase();
  return word.length >= 3 && word.length <= 8 && WORDS.has(crypto.createHash("sha256").update(word).digest("hex").slice(0, 10));
}

function mnemonicRun(text) {
  let run = 0;
  let best = 0;
  for (const token of text.split(/[^A-Za-z]+/)) {
    if (!token) continue;
    if (isWord(token)) {
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
  }
  return best;
}

function views(data) {
  const out = [Buffer.from(data.filter((b) => b !== 0)).toString("utf8")];
  if (data.includes(0)) {
    const even = Buffer.from(data.subarray(0, data.length - (data.length % 2)));
    out.push(even.toString("utf16le"));
    out.push(Buffer.from(even).swap16().toString("utf16le"));
  }
  return out;
}

function masked(text) {
  return text.split("\n").map((line) => {
    let out = line;
    if (/sha256/i.test(out)) {
      out = out.replace(/(sha256[:=])[0-9A-Fa-f]{64}(?![0-9A-Za-z])/gi, (m, label) => label + "~".repeat(64));
      if (/sha256sum/.test(out)) out = out.replace(/(?<![0-9A-Za-z])[0-9A-Fa-f]{64}(?= {1,2}\*?[^\s|])/g, "~".repeat(64));
    }
    return out.replace(HEX64, (m, hex) => (PUBLIC_DIGESTS.has(hex.toLowerCase()) ? "~".repeat(m.length) : m));
  }).join("\n");
}

function lineAt(text, index) {
  let line = 1;
  for (let i = text.indexOf("\n"); i !== -1 && i < index; i = text.indexOf("\n", i + 1)) line += 1;
  return line;
}

function offsetColumn(text, f) {
  if (f.prefixed || !/^[0-9]{6,10}$/.test(f.digits)) return false;
  const start = text.lastIndexOf("\n", f.start - 1) + 1;
  return /^[ \t]*$/.test(text.slice(start, f.start));
}

function near(text, from, to) {
  const gap = text.slice(from, to);
  return gap.length <= NEAR && (gap.match(/\n/g) || []).length <= 3;
}

function splitHex(text, frags) {
  const hits = [];
  let chain = [];
  for (const f of frags) {
    if (f.prefixed || f.digits.length < 4 || offsetColumn(text, f)) continue;
    const prev = chain[chain.length - 1];
    if (f.digits.length >= 64 || (prev && !near(text, prev.end, f.start))) chain = [];
    if (f.digits.length >= 64) continue;
    chain.push(f);
    let sum = 0;
    for (let i = chain.length - 1; i >= 0; i -= 1) {
      sum += chain[i].digits.length;
      if (sum > 64) break;
      if (sum === 64 && i < chain.length - 1) {
        const joined = chain.slice(i).map((x) => x.digits).join("");
        if (/[a-fA-F]/.test(joined) && /[0-9]/.test(joined)) hits.push(chain[i].start);
        break;
      }
    }
  }
  return hits;
}

function byteRuns(text, frags) {
  const hits = [];
  let run = 0;
  let letters = false;
  let start = 0;
  let prev = null;
  let reported = false;
  for (const f of frags) {
    if (offsetColumn(text, f)) {
      if (prev) prev = { end: f.end };
      continue;
    }
    if (f.digits.length !== 2) {
      run = 0;
      prev = null;
      continue;
    }
    if (prev && BYTE_GAP.test(text.slice(prev.end, f.start))) {
      run += 1;
    } else {
      run = 1;
      letters = false;
      reported = false;
      start = f.start;
    }
    letters = letters || /[a-fA-F]/.test(f.digits);
    prev = f;
    if (run >= 32 && letters && !reported) {
      reported = true;
      hits.push(start);
    }
  }
  return hits;
}

function decimalRuns(text) {
  const hits = [];
  let run = 0;
  let start = 0;
  let prev = null;
  const close = () => {
    if (run === 32 || run === 64) hits.push(start);
  };
  for (const m of text.matchAll(DECIMAL)) {
    if (prev && DECIMAL_GAP.test(text.slice(prev, m.index))) {
      run += 1;
    } else {
      close();
      run = 1;
      start = m.index;
    }
    prev = m.index + m[0].length;
  }
  close();
  return hits;
}

function base64Hits(text) {
  const hits = [];
  for (const m of text.matchAll(BASE64)) {
    const body = m[1];
    if (m[2] || (BASE64_LAST.includes(body[42]) && /[A-Z]/.test(body) && /[a-z]/.test(body))) hits.push(m.index);
  }
  return hits;
}

function scanText(name, raw, found, halves) {
  const text = masked(raw);
  const spread = text.replace(/\\x([0-9A-Fa-f]{2})/g, " $1 ");
  const frags = [...spread.matchAll(FRAGMENT)].map((m) => ({ start: m.index, end: m.index + m[0].length, digits: m[2], prefixed: Boolean(m[1]) }));
  const add = (source, index, what) => found.add(`${name}:${lineAt(source, index)}: ${what}`);
  for (const m of text.matchAll(HEX64)) add(text, m.index, "64 hex characters, the shape of a seed");
  for (const at of splitHex(spread, frags)) add(spread, at, "64 hex characters split over several pieces, the shape of a seed");
  for (const at of byteRuns(spread, frags)) add(spread, at, "32 hex bytes in a row, the shape of a seed");
  for (const at of decimalRuns(text)) add(text, at, "a list of 32 byte values, the shape of a seed");
  for (const at of base64Hits(text)) add(text, at, "32 bytes in base64, the shape of a seed");
  if (mnemonicRun(text) >= 12) found.add(`${name}: a run of mnemonic words, the shape of a recovery phrase`);
  for (const f of frags) {
    if (f.digits.length !== 32) continue;
    const key = f.digits.toLowerCase();
    if (!halves.has(key)) halves.set(key, new Set());
    halves.get(key).add(name);
  }
}

function scanBlob(name, data, found, halves) {
  const plain = data.toString("utf8");
  if (PIN_PATHS.has(name) && pinShape(plain)) return;
  if (VECTOR_PATHS.has(name) && vectorShape(plain)) return;
  for (const view of views(data)) scanText(name, view, found, halves);
}

function git(args, input) {
  return execFileSync("git", args, { input, maxBuffer: 1 << 30 });
}

function historyBlobs() {
  const named = new Map();
  for (const line of git(["rev-list", "--all", "--objects"]).toString("utf8").split("\n")) {
    const space = line.indexOf(" ");
    if (space > 0 && !named.has(line.slice(0, space))) named.set(line.slice(0, space), line.slice(space + 1));
  }
  if (named.size === 0) return [];
  const blobs = [];
  for (const line of git(["cat-file", "--batch-check=%(objectname) %(objecttype)"], [...named.keys()].join("\n") + "\n").toString("utf8").split("\n")) {
    const [id, type] = line.split(" ");
    if (type === "blob") blobs.push(id);
  }
  if (blobs.length === 0) return [];
  const out = git(["cat-file", "--batch"], blobs.join("\n") + "\n");
  const result = [];
  let at = 0;
  while (at < out.length) {
    const eol = out.indexOf(10, at);
    const [id, , size] = out.subarray(at, eol).toString("utf8").split(" ");
    const start = eol + 1;
    result.push({ name: named.get(id), data: out.subarray(start, start + Number(size)) });
    at = start + Number(size) + 1;
  }
  return result;
}

function scanRepository() {
  const found = new Set();
  const halves = new Map();
  const paths = new Set(git(["log", "--all", "--format=", "--name-only", "-z", "--no-renames"]).toString("utf8").split(/[\0\n]/).filter(Boolean));
  const tracked = git(["ls-files", "-z"]).toString("utf8").split("\0").filter(Boolean);
  for (const file of tracked) paths.add(file);
  for (const file of paths) {
    if (NAMES.test(file) && !ENV_EXAMPLE.test(file)) found.add(`${file}: a key, seed, wallet or env file is tracked or was tracked`);
  }
  const seen = new Set();
  const blobs = historyBlobs();
  for (const file of tracked) {
    let st;
    try {
      st = fs.lstatSync(file);
    } catch {
      continue;
    }
    blobs.push({ name: file, data: st.isFile() ? fs.readFileSync(file) : Buffer.from(fs.readlinkSync(file)) });
  }
  for (const blob of blobs) {
    const key = `${blob.name}\0${crypto.createHash("sha256").update(blob.data).digest("hex")}`;
    if (seen.has(key)) continue;
    seen.add(key);
    scanBlob(blob.name, blob.data, found, halves);
  }
  if (halves.size >= 2) {
    const where = new Set([...halves.values()].flatMap((s) => [...s]));
    found.add(`${[...where].join(", ")}: 32 hex characters appear in more than one place, the halves of a seed`);
  }
  return [...found];
}

function sampleWords(count) {
  const letters = "abcdefghijklmnopqrstuvwxyz";
  const found = [];
  const walk = (prefix, left) => {
    if (left === 0) {
      if (isWord(prefix)) found.push(prefix);
      return;
    }
    for (const c of letters) walk(prefix + c, left - 1);
  };
  walk("", 3);
  walk("", 4);
  const picked = [];
  while (picked.length < count && found.length > 0) picked.push(found.splice(crypto.randomInt(found.length), 1)[0]);
  return picked;
}

function plantCases() {
  const seed = crypto.randomBytes(32);
  const hex = seed.toString("hex");
  const pairs = hex.match(/../g);
  const words = sampleWords(25);
  const phrase = words.join(" ");
  const groups = [0, 5, 10, 15, 20].map((i) => words.slice(i, i + 5).join(" ")).join("\n");
  const od = [0, 16].map((i) => `${String(i.toString(8)).padStart(7, "0")} ${pairs.slice(i, i + 16).join(" ")}`).join("\n") + "\n0000040\n";
  const pin = `{"chain_id":"Q-test-net-01","genesis_hash":"","roster":[],"seed":"${hex}"}\n`;
  const cleanPin = `{\n  "chain_id": "Q-test-net-01",\n  "genesis_hash": "",\n  "roster": []\n}\n`;
  return [
    ["bare hex", { "c/bare.txt": `${hex}\n` }],
    ["hex over four lines", { "c/lines.txt": [0, 16, 32, 48].map((i) => hex.slice(i, i + 16)).join("\n") + "\n" }],
    ["hex split 33 and 31 with labels", { "c/split.txt": `a=${hex.slice(0, 33)}\nb=${hex.slice(33)}\n` }],
    ["hex halves in two files", { "c/half-one.txt": `part=${hex.slice(0, 32)}\n`, "c/half-two.txt": `part=${hex.slice(32)}\n` }],
    ["hex spaced as od prints", { "c/od-spaced.txt": pairs.join(" ") + "\n" }],
    ["od output with offsets", { "c/od-offsets.txt": od }],
    ["hex with colons", { "c/colons.txt": pairs.join(":") + "\n" }],
    ["hex with commas", { "c/commas.txt": pairs.join(",") + "\n" }],
    ["hex as C escapes", { "c/escape.c": `char seed[] = "${pairs.map((p) => "\\x" + p).join("")}";\n` }],
    ["decimal byte array", { "c/decimal.js": `const seed = new Uint8Array([${[...seed].join(", ")}]);\n` }],
    ["hex byte array", { "c/hex-array.js": `const seed = [${pairs.map((p) => "0x" + p).join(", ")}];\n` }],
    ["base64 without padding", { "c/base64.txt": `seed=${seed.toString("base64").replace(/=+$/, "")}\n` }],
    ["base64url without padding", { "c/base64url.txt": `seed=${seed.toString("base64url")}\n` }],
    ["seed on a line that mentions sha256", { "c/sha256-line.json": `{"name":"deployer","sha256":"none","seed":"${hex}"}\n` }],
    ["phrase on one line", { "c/phrase.txt": `${phrase}\n` }],
    ["phrase in an env line", { "c/phrase-env.txt": `QUANTOVA_PHRASE="${phrase}"\n` }],
    ["phrase one word per line", { "c/phrase-lines.txt": words.join("\n") + "\n" }],
    ["phrase five words per line", { "c/phrase-groups.txt": groups + "\n" }],
    ["phrase capitalised", { "c/phrase-capital.txt": words.map((w) => w[0].toUpperCase() + w.slice(1)).join(" ") + "\n" }],
    ["phrase in upper case", { "c/phrase-upper.txt": phrase.toUpperCase() + "\n" }],
    ["phrase numbered", { "c/phrase-numbered.txt": words.map((w, i) => `${i + 1}. ${w}`).join("\n") + "\n" }],
    ["phrase as a JSON array", { "c/phrase.json": JSON.stringify(words, null, 2) + "\n" }],
    ["UTF-16 little endian file", { "c/utf16le.txt": Buffer.from(`${hex}\n`, "utf16le") }],
    ["UTF-16 big endian file", { "c/utf16be.txt": Buffer.from(`﻿${hex}\n`, "utf16le").swap16() }],
    ["NUL before the seed", { "c/nul.txt": Buffer.concat([Buffer.from("x\0y\n"), Buffer.from(`${hex}\n`)]) }],
    ["key file name", { "deploy/owner.key": "placeholder\n" }],
    ["phrase only in history", { "h/phrase.txt": `export QUANTOVA_PHRASE="${phrase}"\n` }, true],
    ["hex halves only in history", { "h/halves.txt": `a=${hex.slice(0, 32)}\nb=${hex.slice(32)}\n` }, true],
    ["od bytes only in history", { "h/od.txt": pairs.join(" ") + "\n" }, true],
    ["seed in the pin only in history", { "finality-pin.json": pin }, true, { "finality-pin.json": cleanPin }],
  ];
}

function cleanFiles() {
  return {
    "README.md": "Deploy with a funded key and check the result against the pinned genesis hash.\nThe address Q1ZF0T2M759GVM5NMLTVQWQKPPX972HTEKG2C2TZ008QEW22N0XFLSESWNG0 receives the transfer.\n",
    "finality-pin.json": `{\n  "chain_id": "Q-test-net-01",\n  "genesis_hash": "${PUBLISHED_GENESIS}",\n  "roster": []\n}\n`,
    "digests.txt": `empty a7ffc6f8bf1ed76651c14756a061d662f580ff4de43b49fa82d80a4b80f8434a\nabc 3a985da74fe225b2045c172d6bd390bd855f086e3e9d525b46bfe24511431532\n`,
    "pins.txt": `maturin==1.15.0 --hash=sha256:${crypto.createHash("sha256").update("wheel").digest("hex")}\necho "${crypto.createHash("sha256").update("tarball").digest("hex")}  $RUNNER_TEMP/gl.tgz" | sha256sum -c -\n`,
    "code.js": "const G = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];\nconst small = [0, 1, 2, 3, 4, 5];\n",
  };
}

function plant(dir, files) {
  for (const [file, content] of Object.entries(files)) {
    fs.mkdirSync(path.join(dir, path.dirname(file)), { recursive: true });
    fs.writeFileSync(path.join(dir, file), content);
  }
}

function selfTest() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "seed-scan-"));
  const env = Object.assign({}, process.env, { GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" });
  const commit = (dir, message) => execFileSync("git", ["-c", "user.name=check", "-c", "user.email=check@localhost", "-c", "commit.gpgsign=false", "commit", "-q", "-m", message], { cwd: dir, env });
  const repo = (files) => {
    const dir = fs.mkdtempSync(path.join(root, "repo-"));
    execFileSync("git", ["init", "-q"], { cwd: dir, env });
    plant(dir, files);
    execFileSync("git", ["add", "-f", "-A"], { cwd: dir, env });
    commit(dir, "planted");
    return dir;
  };
  const scan = (dir) => spawnSync(process.execPath, [SELF], { cwd: dir, encoding: "utf8", env, maxBuffer: 1 << 26 });
  let failures = 0;
  const check = (label, ok, detail) => {
    console.log(`${ok ? "ok  " : "FAIL"} ${label}`);
    if (!ok) {
      failures += 1;
      console.log(`     ${JSON.stringify(String(detail)).slice(0, 400)}`);
    }
  };
  try {
    const clean = scan(repo(cleanFiles()));
    check("a repository holding only public digests, labelled checksums and addresses passes", clean.status === 0, clean.stdout + clean.stderr);
    for (const [label, files, history, restore] of plantCases()) {
      const dir = repo(Object.assign({}, cleanFiles(), files));
      if (history) {
        execFileSync("git", ["rm", "-q", "-r", "--", ...Object.keys(files)], { cwd: dir, env });
        if (restore) {
          plant(dir, restore);
          execFileSync("git", ["add", "-f", "-A"], { cwd: dir, env });
        }
        commit(dir, "removed");
      }
      const r = scan(dir);
      check(`the scanner fails on ${label}`, r.status === 1 && Object.keys(files).every((f) => r.stdout.includes(f)), r.stdout + r.stderr);
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
  if (failures > 0) {
    console.log(`${failures} planted shapes were not caught`);
    process.exit(1);
  }
  console.log("every planted shape was caught");
}

if (process.argv[2] === "--self-test") {
  selfTest();
} else {
  const problems = scanRepository();
  for (const f of problems) console.log(f);
  if (problems.length > 0) {
    console.log("seed shaped data or key files are tracked or sit in the history, remove them from git");
    process.exit(1);
  }
}
